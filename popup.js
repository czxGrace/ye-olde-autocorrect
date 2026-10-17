const slider = document.getElementById("chaos");
const val = document.getElementById("val");
const count = document.getElementById("count");
const dialog = document.getElementById("dialog");
const yea = document.getElementById("yea");
const nay = document.getElementById("nay");
const verdict = document.getElementById("verdict");

function show(v) { val.textContent = v + "%"; }
function setChaos(v) { slider.value = v; show(v); chrome.storage.sync.set({ chaos: +v }); }

chrome.storage.sync.get({ chaos: 60 }, v => { slider.value = v.chaos; show(v.chaos); });
chrome.storage.local.get({ count: 0 }, v => {
  count.textContent = `${v.count} word${v.count === 1 ? "" : "s"} improved across the realm`;
});

slider.addEventListener("input", () => setChaos(slider.value));

document.getElementById("scrub").addEventListener("click", () => {
  chrome.storage.local.set({ decay: 0 });
});

// ---- the gothic confirm ----

function openDialog() {
  verdict.textContent = "";
  dodges = 0;
  yea.style.left = "70px"; yea.style.top = "190px";
  dialog.classList.add("open");
}
function closeDialog(delay) { setTimeout(() => dialog.classList.remove("open"), delay); }

document.getElementById("off").addEventListener("click", openDialog);

// Yea flees from the cursor, taunting, until it gets tired and lets itself be caught.
const TAUNTS = ["Too slow.", "Hah!", "Catch me, knave.", "Nay, over here.", "Thou art clumsy."];
let dodges = 0;

yea.addEventListener("pointerenter", () => {
  if (dodges >= 6) return;
  dodges++;
  verdict.textContent = dodges >= 6 ? "Fine. I am weary." : TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
  const w = dialog.clientWidth, h = dialog.clientHeight;
  let x, y;
  do {
    x = 10 + Math.random() * (w - 80);
    y = 120 + Math.random() * (h - 165);
  } while (Math.abs(x - parseFloat(yea.style.left)) < 60 && Math.abs(y - parseFloat(yea.style.top)) < 30);
  yea.style.left = x + "px";
  yea.style.top = y + "px";
});

// If they catch it anyway (keyboard, touchpad tap), refuse and make it worse.
yea.addEventListener("click", () => {
  verdict.textContent = "Nay. Thou art bound.";
  setChaos(Math.min(100, +slider.value + 10));
  closeDialog(1400);
});

nay.addEventListener("click", () => {
  verdict.textContent = "Wise.";
  closeDialog(800);
});
