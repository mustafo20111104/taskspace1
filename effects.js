// EFFECTS and the player card: confetti, "+XP" text, toasts, level-up pop-up.
// This file only draws things. The game rules live on the server (game.js).

const TITLES = ["Beginner", "Planner", "Organizer", "Achiever", "Focus Master", "Legend"];

// Where the last click happened, so "+10 XP" appears next to it
let lastPoint = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
document.addEventListener("pointerdown", (e) => { lastPoint = { x: e.clientX, y: e.clientY }; }, true);

function toISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function reducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function levelTitle(level) {
  return TITLES[Math.min(level - 1, TITLES.length - 1)];
}

// The streak counts only if you finished something today or yesterday
function shownStreak(stats) {
  if (!stats.lastDoneDate) return 0;
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return stats.lastDoneDate === toISO(now) || stats.lastDoneDate === toISO(yesterday) ? stats.streak : 0;
}

function renderPlayer(stats, levelChanged) {
  const inLevel = stats.xp % 100;
  document.getElementById("lvl").textContent = "Lv " + stats.level;
  document.getElementById("level-title").textContent = levelTitle(stats.level);
  document.getElementById("xp-fill").style.width = inLevel + "%";
  document.getElementById("xp-text").textContent = inLevel + " / 100 XP";

  const streak = shownStreak(stats);
  const streakEl = document.getElementById("streak");
  streakEl.className = "streak" + (streak > 0 ? " on" : "");
  streakEl.textContent = "";
  const flame = document.createElement("span");
  flame.className = "flame";
  flame.textContent = "🔥";
  streakEl.append(flame, " " + streak + (streak === 1 ? " day" : " days"));

  const doneToday = stats.lastDoneDate === toISO(new Date());
  document.getElementById("streak-hint").textContent = doneToday
    ? "Streak is safe for today"
    : streak > 0 ? "Finish one item today to keep your streak" : "Finish a to-do or card to start a streak";

  if (levelChanged) {
    const lvl = document.getElementById("lvl");
    lvl.classList.remove("bump");
    void lvl.offsetWidth;
    lvl.classList.add("bump");
  }
}

function confetti(x, y, count, big) {
  if (reducedMotion()) return;
  const colors = ["#6c63e8", "#2a9d6a", "#f0b440", "#ff6b81", "#38bdf8"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("i");
    piece.className = "confetti";
    const angle = Math.random() * Math.PI * 2;
    const distance = 50 + Math.random() * (big ? 260 : 100);
    piece.style.left = x + "px";
    piece.style.top = y + "px";
    piece.style.background = colors[i % colors.length];
    piece.style.setProperty("--dx", Math.cos(angle) * distance + "px");
    piece.style.setProperty("--dy", Math.sin(angle) * distance - 50 + "px");
    piece.style.setProperty("--rot", Math.random() * 720 - 360 + "deg");
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1000);
  }
}

function floatText(x, y, text) {
  const el = document.createElement("div");
  el.className = "floatxp";
  el.textContent = text;
  el.style.left = x + "px";
  el.style.top = y + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function toast(text) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3100);
}

function showLevelUp(level) {
  const overlay = document.createElement("div");
  overlay.className = "levelup";
  overlay.innerHTML = '<div class="levelup-card" role="dialog" aria-label="Level up"><div class="big"></div><h2>Level up!</h2><p></p><button>Keep going</button></div>';
  overlay.querySelector(".big").textContent = "Lv " + level;
  overlay.querySelector("p").textContent = "You are now a " + levelTitle(level) + ".";
  const close = () => overlay.remove();
  overlay.querySelector("button").onclick = close;
  overlay.onclick = (event) => { if (event.target === overlay) close(); };
  document.body.appendChild(overlay);
  overlay.querySelector("button").focus();
  confetti(window.innerWidth / 2, window.innerHeight / 2, 70, true);
}
