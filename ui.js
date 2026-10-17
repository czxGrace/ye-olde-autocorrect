// All the on-page theatrics: manuscript decay, wax seal on send, quill cursor,
// ink blots, the candle, and the swap toast. Everything lives in one shadow root
// so the host page's CSS can't touch it.
(() => {
  if (self.OLDE_UI) return;

  const FONT = "OldeBlackletter";
  const DECAY_FULL = 30;      // swaps until the page is fully rotted
  const BURN_KEYS = 80;       // keystrokes per candle

  // ---------- assets ----------

  const QUILL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <path d="M9 23 C 11 13, 19 6, 30 2 C 27 11, 20 18, 10 24 Z" fill="#fbf3dc" stroke="#3b2208" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M10 23 L 28 4" stroke="#3b2208" stroke-width="0.9"/>
    <path d="M14 17 l3 1 M17 13 l3 1 M20 10 l3 1 M13 15 l-1 -3 M16 11 l-1 -3" stroke="#3b2208" stroke-width="0.7"/>
    <path d="M3 29 L 10 23" stroke="#1a1008" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
  const QUILL = "data:image/svg+xml," + encodeURIComponent(QUILL_SVG);

  function grain(alpha) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>
      <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix values='0 0 0 0 0.25  0 0 0 0 0.14  0 0 0 0 0.04  0 0 0 1 0'/></filter>
      <rect width='100%' height='100%' filter='url(#n)' opacity='${alpha}'/></svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function sealPath() {
    let d = "";
    const bumps = 22;
    for (let i = 0; i <= bumps * 2; i++) {
      const a = (i / (bumps * 2)) * Math.PI * 2;
      const r = i % 2 ? 66 + Math.random() * 4 : 74 + Math.random() * 5;
      d += (i ? "L" : "M") + (80 + Math.cos(a) * r).toFixed(1) + " " + (80 + Math.sin(a) * r).toFixed(1) + " ";
    }
    return d + "Z";
  }

  const SEAL_SVG = `<svg viewBox="0 0 160 160" width="220" height="220">
    <defs><radialGradient id="wax" cx="40%" cy="35%" r="70%">
      <stop offset="0" stop-color="#d23a3a"/><stop offset=".6" stop-color="#9e1b1b"/><stop offset="1" stop-color="#5c0b0b"/>
    </radialGradient></defs>
    <path d="${sealPath()}" fill="url(#wax)" stroke="#4a0808" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="80" cy="80" r="50" fill="none" stroke="#6e0f0f" stroke-width="4"/>
    <circle cx="80" cy="80" r="44" fill="none" stroke="#c84646" stroke-width="1.5" opacity=".6"/>
    <text x="80" y="102" text-anchor="middle" font-family="${FONT}, serif" font-size="70" fill="#5c0b0b">Y</text>
    <text x="78" y="99" text-anchor="middle" font-family="${FONT}, serif" font-size="70" fill="#c94a4a" opacity=".45">Y</text>
    <ellipse cx="58" cy="50" rx="18" ry="8" fill="#fff" opacity=".18" transform="rotate(-30 58 50)"/>
  </svg>`;

  const CANDLE_SVG = `<svg viewBox="0 0 60 170" width="54" height="153">
    <defs>
      <radialGradient id="glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".85"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
      <linearGradient id="wax" x1="0" x2="1"><stop offset="0" stop-color="#e3d4b2"/><stop offset=".5" stop-color="#fff8e8"/><stop offset="1" stop-color="#d2bf96"/></linearGradient>
    </defs>
    <g class="flame-g" transform="translate(30,44)">
      <circle class="glow" r="28" fill="url(#glow)"/>
      <path class="flame" d="M0 -26 C 7 -14, 9 -6, 0 2 C -9 -6, -7 -14, 0 -26 Z" fill="#ffb627"/>
      <path class="flame flame-in" d="M0 -14 C 3 -8, 4 -3, 0 1 C -4 -3, -3 -8, 0 -14 Z" fill="#fff3c4"/>
    </g>
    <line class="wick" x1="30" x2="30" y1="44" y2="50" stroke="#222" stroke-width="2"/>
    <rect class="body" x="18" y="50" width="24" height="100" rx="3" fill="url(#wax)" stroke="#b8a37a"/>
    <ellipse cx="30" cy="154" rx="26" ry="7" fill="#7a5a2c"/>
    <ellipse cx="30" cy="151" rx="16" ry="4" fill="#a8844a"/>
  </svg>`;

  const CSS = `
    :host { all: initial; }
    .decay { position: fixed; inset: 0; display: none; }
    .dark { position: fixed; inset: 0; background: #050300; opacity: 0; transition: opacity 1.5s;
            display: flex; justify-content: center; align-items: flex-start; }
    .dark-msg { margin-top: 18vh; color: #f3e3b8; text-align: center; font: 16px/1.5 Georgia, serif;
                opacity: 0; transition: opacity 1s .8s; }
    .dark.out .dark-msg { opacity: 1; }
    .dark-msg .big { font-family: ${FONT}, serif; font-size: 46px; margin-bottom: 6px; }
    .blot { position: fixed; transition: opacity 1.2s; }
    .candle { position: fixed; left: 14px; bottom: 10px; filter: drop-shadow(0 4px 8px rgba(0,0,0,.35)); }
    .candle.hidden { display: none; }
    .flame { transform-box: fill-box; transform-origin: 50% 100%; animation: flick .13s infinite alternate; }
    .flame-in { animation-duration: .21s; }
    .glow { animation: pulse 1.7s infinite alternate; }
    @keyframes flick { from { transform: scale(1,1) skewX(0); } to { transform: scale(.9,1.1) skewX(4deg); } }
    @keyframes pulse { from { opacity: .7; } to { opacity: 1; } }
    .toast { position: fixed; right: 16px; bottom: 16px; font: 13px/1.4 Georgia, serif; color: #4a2c0a;
             background: #f3e3b8; border: 1px solid #c9a96a; border-radius: 6px; padding: 10px 14px; max-width: 300px;
             box-shadow: 0 6px 20px rgba(0,0,0,.25); opacity: 0; transform: translateY(10px);
             transition: opacity .25s, transform .25s; }
    .toast.show { opacity: 1; transform: none; }
    .toast .w { font-family: ${FONT}, serif; font-size: 20px; }
    .toast .d { font-style: italic; opacity: .8; margin-top: 2px; }
    .seal-wrap { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; visibility: hidden; }
    .seal-wrap.go { visibility: visible; animation: flash 2.6s; }
    .seal { text-align: center; opacity: 0; }
    .seal-wrap.go .seal { animation: slam 2.6s cubic-bezier(.2,.9,.3,1.2) forwards; }
    .seal-text { font-family: ${FONT}, serif; font-size: 32px; color: #f3e3b8; text-shadow: 0 2px 10px rgba(0,0,0,.9); margin-top: 4px; }
    @keyframes slam {
      0% { transform: scale(3.2) rotate(-25deg); opacity: 0; }
      13% { transform: scale(.92) rotate(4deg); opacity: 1; }
      19% { transform: scale(1.04) rotate(-1deg); }
      25% { transform: scale(1) rotate(0); }
      85% { transform: scale(1); opacity: 1; }
      100% { transform: scale(1); opacity: 0; }
    }
    @keyframes flash { 0% { background: rgba(0,0,0,0); } 13% { background: rgba(0,0,0,.4); } 100% { background: rgba(0,0,0,0); } }
  `;

  // ---------- mounting ----------

  let host, root, el = {};

  function injectPageStyle() {
    if (document.getElementById("olde-page-style")) return;
    let fontUrl = "";
    try { fontUrl = chrome.runtime.getURL("fonts/blackletter.woff2"); } catch (_) {}
    const s = document.createElement("style");
    s.id = "olde-page-style";
    s.textContent = `
      @font-face { font-family: "${FONT}"; src: url("${fontUrl}") format("woff2"); }
      textarea, input[type="text"], input[type="search"],
      [contenteditable="true"], [contenteditable="true"] *,
      [contenteditable=""], [contenteditable=""] *,
      [contenteditable="plaintext-only"], [contenteditable="plaintext-only"] * {
        cursor: url("${QUILL}") 3 29, text !important;
      }`;
    (document.head || document.documentElement).appendChild(s);
  }

  function mount() {
    if (host) return;
    injectPageStyle();
    host = document.createElement("div");
    host.id = "olde-host";
    host.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";
    root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${CSS}</style>
      <div class="decay"></div>
      <div class="dark"><div class="dark-msg">
        <div class="big">The candle hath guttered.</div>
        <div>Type <i>prithee</i> to light another.</div>
      </div></div>
      <div class="blots"></div>
      <div class="candle hidden">${CANDLE_SVG}</div>
      <div class="toast"></div>
      <div class="seal-wrap"><div class="seal">${SEAL_SVG}<div class="seal-text">Sealed and dispatched by royal courier</div></div></div>`;
    document.documentElement.appendChild(host);
    for (const k of ["decay", "dark", "blots", "candle", "toast", "seal-wrap"]) el[k] = root.querySelector("." + k);
    el.body = root.querySelector(".body");
    el.wick = root.querySelector(".wick");
    el.flameG = root.querySelector(".flame-g");
  }

  // Cursor works even before anything else mounts.
  injectPageStyle();

  // ---------- 2. manuscript decay ----------

  const isTop = self === self.top;

  function applyDecay(n) {
    if (!isTop) return;      // one overlay for the whole tab, not one per iframe
    const d = Math.min(1, (n || 0) / DECAY_FULL);
    if (d <= 0) { if (host) el.decay.style.display = "none"; return; }
    mount();
    const s = el.decay.style;
    s.display = "block";
    s.backdropFilter = `sepia(${(0.95 * d).toFixed(3)}) saturate(${(1 - 0.35 * d).toFixed(3)}) ` +
                       `contrast(${(1 + 0.12 * d).toFixed(3)}) brightness(${(1 - 0.1 * d).toFixed(3)})`;
    s.background = `url("${grain((0.3 * d).toFixed(3))}"), ` +
                   `radial-gradient(ellipse at center, transparent ${60 - 25 * d}%, rgba(70,35,5,${(0.75 * d).toFixed(3)}) 100%)`;
    s.boxShadow = `inset 0 0 ${Math.round(60 + 120 * d)}px rgba(40,18,0,${(0.85 * d).toFixed(3)})`;
  }

  try {
    chrome.storage.local.get({ decay: 0 }, v => applyDecay(v.decay));
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === "local" && ch.decay) applyDecay(ch.decay.newValue);
    });
  } catch (_) {}

  // ---------- swap toast (called by content.js) ----------

  let hideTimer;
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function announce(orig, out) {
    mount();
    try {
      chrome.storage.local.get({ count: 0, decay: 0 }, v =>
        chrome.storage.local.set({ count: v.count + 1, decay: v.decay + 1 }));
    } catch (_) {}
    el.toast.innerHTML = `"${esc(orig)}" is now <span class="w">${esc(out.text)}</span>` +
      (out.def ? `<div class="d">${esc(out.def)}</div>` : "");
    el.toast.classList.add("show");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => el.toast.classList.remove("show"), 2500);
  }

  // ---------- 3. wax seal on send ----------

  function thud(ctx, t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(35, t + 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(ctx.destination);
    o.start(t); o.stop(t + 0.5);

    const len = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(), g2 = ctx.createGain();
    src.buffer = buf; g2.gain.value = 0.45;
    src.connect(g2).connect(ctx.destination);
    src.start(t);
  }

  let sealBusy = false;
  function seal() {
    if (sealBusy) return;
    sealBusy = true;
    mount();
    const w = el["seal-wrap"];
    w.classList.remove("go");
    void w.offsetWidth;          // restart the animation
    w.classList.add("go");
    try {
      const ctx = new (self.AudioContext || self.webkitAudioContext)();
      thud(ctx, ctx.currentTime + 0.33);
      setTimeout(() => ctx.close(), 1500);
    } catch (_) {}
    setTimeout(() => {
      try {
        document.documentElement.animate(
          [{ transform: "translate(0,0)" }, { transform: "translate(-8px,5px)" }, { transform: "translate(7px,-6px)" },
           { transform: "translate(-5px,-3px)" }, { transform: "translate(3px,4px)" }, { transform: "translate(0,0)" }],
          { duration: 350 });
      } catch (_) {}
    }, 330);
    setTimeout(() => { w.classList.remove("go"); sealBusy = false; }, 2700);
  }

  document.addEventListener("click", e => {
    const b = e.target.closest && e.target.closest('[role="button"], button, input[type="submit"]');
    if (!b) return;
    const label = (b.getAttribute("aria-label") || b.getAttribute("data-tooltip") || b.value || b.textContent || "").trim();
    if (/^send\b/i.test(label)) seal();
  }, true);

  document.addEventListener("keydown", e => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      const t = e.target;
      if (t && (t.isContentEditable || t.tagName === "TEXTAREA")) seal();
    }
  }, true);

  // ---------- 4. ink blots when typing fast ----------

  let lastKey = 0, streak = 0;

  function caretPoint(target) {
    if (target.isContentEditable) {
      const sel = getSelection();
      if (sel.rangeCount) {
        const r = sel.getRangeAt(0);
        const rects = r.getClientRects();
        const rc = rects[rects.length - 1] || r.getBoundingClientRect();
        if (rc && (rc.left || rc.top)) return { x: rc.right, y: rc.top + rc.height / 2 };
      }
    }
    const b = target.getBoundingClientRect();
    return {
      x: b.left + 20 + Math.random() * Math.max(0, b.width - 40),
      y: b.top + b.height * (0.3 + Math.random() * 0.5)
    };
  }

  function blot(x, y) {
    mount();
    if (el.blots.childElementCount > 40) el.blots.firstElementChild.remove();
    let shapes = `<circle cx="40" cy="40" r="${7 + Math.random() * 7}"/>`;
    const drops = 5 + Math.floor(Math.random() * 6);
    for (let i = 0; i < drops; i++) {
      const a = Math.random() * Math.PI * 2, dist = 12 + Math.random() * 22;
      shapes += `<circle cx="${(40 + Math.cos(a) * dist).toFixed(1)}" cy="${(40 + Math.sin(a) * dist).toFixed(1)}" r="${(1 + Math.random() * 3.5).toFixed(1)}"/>`;
    }
    const d = document.createElement("div");
    d.className = "blot";
    d.style.left = (x - 40 + (Math.random() - 0.5) * 24) + "px";
    d.style.top = (y - 40 + (Math.random() - 0.5) * 24) + "px";
    d.innerHTML = `<svg width="80" height="80" viewBox="0 0 80 80"><g fill="#1a1008" opacity=".85">${shapes}</g></svg>`;
    el.blots.appendChild(d);
    setTimeout(() => (d.style.opacity = "0"), 3000);
    setTimeout(() => d.remove(), 4300);
  }

  // ---------- 5. the candle ----------

  let candle = 1, lit = true, typed = "";

  function drawCandle() {
    const h = 6 + 94 * candle, top = 150 - h;
    el.body.setAttribute("y", top);
    el.body.setAttribute("height", h);
    el.wick.setAttribute("y1", top - 6);
    el.wick.setAttribute("y2", top);
    el.flameG.setAttribute("transform", `translate(30,${top - 6})`);
    el.flameG.style.display = lit ? "" : "none";
    let dim = 0;
    if (!lit) dim = 0.8;
    else if (candle < 0.3) dim = ((0.3 - candle) / 0.3) * 0.35;
    el.dark.style.opacity = dim;
    el.dark.classList.toggle("out", !lit);
  }

  // ---------- shared keystroke listener ----------

  function isEditable(t) {
    if (!t || !t.tagName) return false;
    if (t.tagName === "TEXTAREA") return true;
    if (t.tagName === "INPUT") return t.type === "text" || t.type === "search";
    return t.isContentEditable;
  }

  document.addEventListener("input", e => {
    const t = e.target;
    if (!isEditable(t)) return;
    mount();
    el.candle.classList.remove("hidden");

    // relight check
    if (e.data) typed = (typed + e.data.toLowerCase()).slice(-40);
    if (!lit) {
      if (typed.includes("prithee")) { lit = true; candle = 1; typed = ""; }
      drawCandle();
      return;
    }

    // burn
    candle -= 1 / BURN_KEYS;
    if (candle <= 0) { candle = 0; lit = false; }
    drawCandle();

    // ink blots
    const now = performance.now();
    streak = now - lastKey < 130 ? streak + 1 : 0;
    lastKey = now;
    if (streak >= 4 && Math.random() < 0.4) {
      const p = caretPoint(t);
      blot(p.x, p.y);
    }
  }, true);

  self.OLDE_UI = { announce, seal };
})();
