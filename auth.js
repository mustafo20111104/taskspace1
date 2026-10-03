// FRONTEND for the login and register pages.
// It sends the form to the backend and, if it works, shows a small
// success animation and opens the planner.

const msg = document.getElementById("msg");
const card = document.getElementById("card");

// If you are already logged in, skip this page
fetch("/api/auth/me").then((res) => { if (res.ok) location.href = "/"; });

function showError(text) {
  msg.textContent = text;
  card.classList.remove("shake");
  void card.offsetWidth;            // restart the animation
  card.classList.add("shake");
}

function showSuccess(title, text) {
  const view = document.getElementById("form-view");
  view.innerHTML = "";
  const box = document.createElement("div");
  box.className = "success";
  box.innerHTML = '<svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-17"/></svg>';
  const h = document.createElement("h1");
  h.textContent = title;          // textContent keeps names safe from HTML injection
  const p = document.createElement("p");
  p.textContent = text;
  box.append(h, p);
  view.appendChild(box);
}

async function send(url, body, button, onSuccess) {
  msg.textContent = "";
  button.disabled = true;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    onSuccess(data);
    setTimeout(() => { location.href = "/"; }, 1400);
  } catch (err) {
    showError(err.message === "Failed to fetch" ? "Could not reach the server. Is it running?" : err.message);
    button.disabled = false;
  }
}

// ----- Register page -----
const registerForm = document.getElementById("register-form");
if (registerForm) {
  const passwordInput = document.getElementById("password");
  const meter = document.getElementById("meter");
  const strengthText = document.getElementById("strength");

  // Password strength meter (only a hint, the server checks the real rules)
  passwordInput.addEventListener("input", () => {
    const p = passwordInput.value;
    let score = 0;
    if (p.length >= 8) {
      score = 1;
      if ((/[a-z]/.test(p) && /[A-Z]/.test(p)) || (/\d/.test(p) && /[a-zA-Z]/.test(p))) score = 2;
      if (score === 2 && (p.length >= 12 || /[^A-Za-z0-9]/.test(p))) score = 3;
    }
    meter.dataset.s = score;
    strengthText.textContent = p.length === 0 ? "At least 8 characters" : ["Too short", "Weak", "Good", "Strong"][score];
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = passwordInput.value;
    const confirm = document.getElementById("confirm").value;

    if (!name) return showError("Please enter your name.");
    if (!email) return showError("Please enter your email.");
    if (password.length < 8) return showError("Password must be at least 8 characters.");
    if (password !== confirm) return showError("Passwords do not match.");

    send("/api/auth/register", { name, email, password }, registerForm.querySelector("button"),
      (user) => showSuccess("Welcome, " + user.name + "!", "You start at Level 1. Your workspace is ready."));
  });
}

// ----- Login page -----
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (!email || !password) return showError("Please enter your email and password.");

    send("/api/auth/login", { email, password }, loginForm.querySelector("button"),
      (user) => showSuccess("Welcome back, " + user.name + "!", "Level " + user.stats.level + " · " + user.stats.xp + " XP"));
  });
}
