(() => {
  if (self.__oldeLoaded) return;
  self.__oldeLoaded = true;

  const { MAP, OBSCURE } = self.OLDE;
  const DELIM = /^[\s.,!?;:]$/;          // \s also covers the non-breaking spaces editors insert
  const WORD_END = /([A-Za-z'’]+)$/;

  let chaos = 0.6;
  let busy = false;

  try {
    chrome.storage.sync.get({ chaos: 60 }, v => { chaos = v.chaos / 100; });
    chrome.storage.onChanged.addListener(ch => {
      if (ch.chaos) chaos = ch.chaos.newValue / 100;
    });
  } catch (_) {}

  // ---- word logic ----

  function matchCase(src, out) {
    if (src.length > 1 && src === src.toUpperCase()) return out.toUpperCase();
    if (src[0] !== src[0].toLowerCase()) {
      const i = out.search(/[a-z]/i);
      return out.slice(0, i) + out[i].toUpperCase() + out.slice(i + 1);
    }
    return out;
  }

  function pick(word) {
    const key = word.toLowerCase().replace(/’/g, "'");
    if (MAP[key] && Math.random() < chaos) {
      return { text: matchCase(word, MAP[key]), def: null };
    }
    if (key.length > 3 && Math.random() < chaos * 0.2) {
      const [w, def] = OBSCURE[Math.floor(Math.random() * OBSCURE.length)];
      return { text: matchCase(word, w), def };
    }
    return null;
  }

  // ---- hooking into typing ----

  function isTextField(el) {
    if (el.tagName === "TEXTAREA") return true;
    if (el.tagName === "INPUT") return el.type === "text" || el.type === "search";
    return false;
  }

  document.addEventListener("input", e => {
    if (busy || e.inputType !== "insertText" || !e.data || !DELIM.test(e.data)) return;
    const el = e.target;
    // Let the site's own editor finish handling the keystroke first.
    setTimeout(() => {
      try {
        if (isTextField(el)) swapInField(el);
        else if (el.isContentEditable) swapInEditable();
      } catch (err) {
        busy = false;
      }
    }, 0);
  }, true);

  // Plain <input>/<textarea>
  function swapInField(el) {
    const caret = el.selectionStart;
    if (caret == null || caret !== el.selectionEnd || caret < 2) return;
    const before = el.value.slice(0, caret);
    if (!DELIM.test(before.slice(-1))) return;
    const m = before.slice(0, -1).match(WORD_END);
    if (!m) return;
    const out = pick(m[1]);
    if (!out) return;

    const start = caret - 1 - m[1].length, end = caret - 1;
    busy = true;
    el.setSelectionRange(start, end);
    // insertText goes through the browser's normal editing path, so React-style
    // inputs and the undo stack both see it as real typing.
    if (!document.execCommand("insertText", false, out.text)) {
      el.setRangeText(out.text, start, end, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const pos = start + out.text.length + 1;
    el.setSelectionRange(pos, pos);
    busy = false;
    announce(m[1], out);
  }

  // Rich editors: Gmail compose, Slack, Discord, Notion, LinkedIn, etc.
  function swapInEditable() {
    const sel = getSelection();
    if (!sel.rangeCount || !sel.isCollapsed) return;
    const node = sel.anchorNode, off = sel.anchorOffset;
    if (!node || node.nodeType !== Node.TEXT_NODE || off < 2) return;
    const text = node.textContent;
    if (!DELIM.test(text[off - 1])) return;
    const m = text.slice(0, off - 1).match(WORD_END);
    if (!m) return;
    const out = pick(m[1]);
    if (!out) return;

    const r = document.createRange();
    r.setStart(node, off - 1 - m[1].length);
    r.setEnd(node, off - 1);
    busy = true;
    sel.removeAllRanges();
    sel.addRange(r);
    document.execCommand("insertText", false, out.text);
    sel.modify("move", "forward", "character");   // hop back over the space you typed
    busy = false;
    announce(m[1], out);
  }

  function announce(orig, out) {
    if (self.OLDE_UI) self.OLDE_UI.announce(orig, out);
  }
})();
