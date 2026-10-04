// APP: the main page. It connects everything:
//   - the sidebar (account, level, page tree, search, new page)
//   - opening a page (document editor or board)
//   - auto-save to the server, and the XP effects when the server gives points
// The editors are in editor.js and board.js, the effects in effects.js.

// ---------- State (what the page remembers) ----------
let pages = [];                    // small info about all pages (for the sidebar)
let current = null;                // the open page, with its content
let stats = { xp: 0, level: 1, streak: 0, lastDoneDate: null };
const expanded = new Set();        // sidebar rows that are open

const $ = (id) => document.getElementById(id);

// ---------- Talking to the server ----------
async function api(url, options) {
  let res;
  try {
    res = await fetch(url, Object.assign({ headers: { "Content-Type": "application/json" } }, options));
  } catch (err) {
    showError("Could not reach the server.");
    throw err;
  }
  if (res.status === 401) { location.href = "/login.html"; throw new Error("Not logged in"); }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    showError(data.error || "Something went wrong.");
    throw new Error("Server error " + res.status);
  }
  return res.status === 204 ? null : res.json();
}

function showError(text) {
  const bar = document.createElement("div");
  bar.className = "error-bar";
  bar.setAttribute("role", "alert");
  bar.textContent = text;
  document.body.appendChild(bar);
  setTimeout(() => bar.remove(), 3500);
}

// ---------- Auto-save ----------
let saveTimer = null;     // waits a moment after typing before saving
let saving = null;        // the save that is running now
let dirty = false;        // there are changes not saved yet
let failed = false;

function setStatus(text) { $("save-state").textContent = text; }

function scheduleSave(immediate) {
  if (!current) return;
  dirty = true;
  failed = false;
  setStatus("Saving…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(runSave, immediate ? 0 : 700);
}

async function runSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  if (saving) return saving;                // the running save will check "dirty" again when it ends
  if (!dirty || !current) return;
  dirty = false;
  const page = current;
  saving = (async () => {
    try {
      const result = await api("/api/pages/" + page.id, {
        method: "PUT",
        body: JSON.stringify({ title: page.title, icon: page.icon, content: page.content, today: toISO(new Date()) })
      });
      handleReward(result);
      setStatus("Saved");
    } catch (err) {
      dirty = true;
      failed = true;
      setStatus("Not saved");
    } finally {
      saving = null;
      if (dirty && !failed && current === page) runSave();
    }
  })();
  return saving;
}

// Save everything now (used before opening another page or logging out)
async function flushSave() {
  clearTimeout(saveTimer);
  saveTimer = null;
  while ((dirty || saving) && !failed) {
    if (saving) await saving;
    else await runSave();
  }
}

// The server tells us if we earned XP
function handleReward(result) {
  const before = stats;
  stats = result.stats;
  renderPlayer(stats, stats.level > before.level);

  if (result.gained > 0) {
    floatText(lastPoint.x, lastPoint.y, "+" + result.gained + " XP");
    confetti(lastPoint.x, lastPoint.y, 26, false);
    if (stats.level > before.level) {
      setTimeout(() => showLevelUp(stats.level), 450);
    } else if (shownStreak(stats) > shownStreak(before)) {
      toast("🔥 " + shownStreak(stats) + (shownStreak(stats) === 1 ? " day streak started!" : " day streak!"));
    }
  } else if (result.capped) {
    toast("Daily XP limit reached (200 XP). Come back tomorrow!");
  }
}

// ---------- Sidebar: the page tree ----------
function titleOf(p) { return p.title || "Untitled"; }

function renderTree() {
  const tree = $("tree");
  const query = $("search").value.trim().toLowerCase();
  tree.innerHTML = "";

  if (!pages.length) {
    tree.innerHTML = '<div class="tree-empty">No pages yet.</div>';
    return;
  }

  if (query) {                                   // searching: a flat list
    const found = pages.filter((p) => titleOf(p).toLowerCase().includes(query));
    found.forEach((p) => tree.appendChild(treeRow(p, 0, true)));
    if (!found.length) tree.innerHTML = '<div class="tree-empty">Nothing found.</div>';
    return;
  }

  const children = (parentId) => pages.filter((p) => (p.parentId || null) === parentId);
  (function add(parentId, depth) {
    children(parentId).forEach((p) => {
      tree.appendChild(treeRow(p, depth, false));
      if (expanded.has(p.id)) add(p.id, depth + 1);
    });
  })(null, 0);
}

function treeRow(p, depth, flat) {
  const row = document.createElement("div");
  row.className = "tree-row" + (current && current.id === p.id ? " active" : "");
  row.style.paddingLeft = 6 + depth * 16 + "px";
  row.dataset.id = p.id;

  const hasKids = !flat && pages.some((c) => c.parentId === p.id);
  const toggle = document.createElement("button");
  toggle.className = "tree-toggle" + (hasKids ? "" : " empty");
  toggle.textContent = expanded.has(p.id) ? "▾" : "▸";
  toggle.setAttribute("aria-label", "Show sub-pages");
  toggle.onclick = (e) => {
    e.stopPropagation();
    if (expanded.has(p.id)) expanded.delete(p.id); else expanded.add(p.id);
    renderTree();
  };

  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = p.icon;
  const title = document.createElement("span");
  title.className = "tree-title" + (p.title ? "" : " untitled");
  title.textContent = titleOf(p);

  const add = document.createElement("button");
  add.className = "tree-add";
  add.textContent = "+";
  add.title = "Add a sub-page";
  add.setAttribute("aria-label", "Add a sub-page");
  add.onclick = (e) => { e.stopPropagation(); expanded.add(p.id); newPage("doc", null, p.id); };

  row.append(toggle, icon, title, add);
  row.onclick = () => { go(p.id); $("shell").classList.remove("nav-open"); };
  return row;
}

// ---------- Opening pages ----------
function go(id) {
  if (location.hash === "#/" + id) loadPage(id);   // same address: open it anyway
  else location.hash = "#/" + id;                  // the hashchange event opens it
}

async function loadPage(id) {
  await flushSave();
  let page;
  try {
    page = await api("/api/pages/" + id);
  } catch (err) {
    current = null;
    showEmpty();
    return;
  }
  current = page;
  dirty = false;
  failed = false;
  setStatus("");

  // open the parents in the sidebar so this page is visible
  let parent = pages.find((p) => p.id === page.parentId);
  while (parent) { expanded.add(parent.id); parent = pages.find((p) => p.id === parent.parentId); }

  drawPage();
  renderTree();
  renderCrumbs();
}

function drawPage() {
  const view = $("view");
  view.innerHTML = "";
  $("delete-btn").hidden = false;

  const wrap = document.createElement("div");
  wrap.className = "page" + (current.type === "board" ? " wide" : "");

  const iconBtn = document.createElement("button");
  iconBtn.className = "page-icon";
  iconBtn.textContent = current.icon;
  iconBtn.title = "Change icon";
  iconBtn.setAttribute("aria-label", "Change icon");
  iconBtn.onclick = () => openEmojiPicker(iconBtn);

  const title = document.createElement("input");
  title.className = "page-title";
  title.value = current.title;
  title.placeholder = "Untitled";
  title.maxLength = 100;
  title.setAttribute("aria-label", "Page title");
  title.addEventListener("input", () => {
    current.title = title.value;
    const meta = pages.find((p) => p.id === current.id);
    if (meta) meta.title = title.value;
    renderTree();
    renderCrumbs();
    scheduleSave();
  });

  const body = document.createElement("div");
  wrap.append(iconBtn, title, body);
  view.appendChild(wrap);

  if (current.type === "board") {
    BoardEditor.mount(body, current.content, scheduleSave);
  } else {
    const editor = DocEditor.mount(body, current.content, scheduleSave);
    if (!current.title && !current.content.blocks.some((b) => b.text)) title.focus();
    else if (!title.value) editor.focusFirst();
  }
  if (!current.title) setTimeout(() => title.focus(), 0);
}

function showEmpty() {
  $("delete-btn").hidden = true;
  $("crumbs").textContent = "";
  $("view").innerHTML = "";
  const box = document.createElement("div");
  box.className = "empty-state";
  box.innerHTML = "<h2>No page open</h2><p>Create a page to start writing and planning.</p>";
  const row = document.createElement("div");
  row.className = "row";
  [["📄 New page", "doc", null], ["🗂️ New board", "board", null], ["📅 Weekly board", "board", "week"]].forEach(([label, type, template]) => {
    const b = document.createElement("button");
    b.className = "btn";
    b.textContent = label;
    b.onclick = () => newPage(type, template, null);
    row.appendChild(b);
  });
  box.appendChild(row);
  $("view").appendChild(box);
  renderTree();
}

function renderCrumbs() {
  const nav = $("crumbs");
  nav.textContent = "";
  if (!current) return;
  const chain = [];
  let p = pages.find((x) => x.id === current.id);
  while (p) { chain.unshift(p); p = pages.find((x) => x.id === p.parentId); }
  chain.forEach((page, i) => {
    if (i > 0) nav.append("/");
    const a = document.createElement("a");
    a.className = i === chain.length - 1 ? "here" : "";
    a.textContent = page.icon + " " + titleOf(page);
    if (i < chain.length - 1) a.onclick = () => go(page.id);
    nav.appendChild(a);
  });
}

// ---------- Creating and deleting pages ----------
async function newPage(type, template, parentId) {
  await flushSave();
  const page = await api("/api/pages", { method: "POST", body: JSON.stringify({ type, template, parentId }) });
  pages.push({ id: page.id, parentId: page.parentId, title: page.title, icon: page.icon, type: page.type, updatedAt: page.updatedAt });
  if (parentId) expanded.add(parentId);
  $("shell").classList.remove("nav-open");
  go(page.id);
}

async function deleteCurrent() {
  if (!current) return;
  if (!confirm("Delete \"" + titleOf(current) + "\" and all its sub-pages?")) return;
  const id = current.id;
  dirty = false;
  clearTimeout(saveTimer);
  await saving;
  const result = await api("/api/pages/" + id, { method: "DELETE" });
  pages = pages.filter((p) => !result.deleted.includes(p.id));
  current = null;
  const next = pages.find((p) => !p.parentId) || pages[0];
  if (next) go(next.id); else { location.hash = ""; showEmpty(); }
}

// ---------- Popups: new page menu and emoji picker ----------
function closePop() { const pop = $("pop"); pop.hidden = true; pop.innerHTML = ""; }

function openPop(anchor, build, above) {
  const pop = $("pop");
  pop.innerHTML = "";
  build(pop);
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8)) + "px";
  pop.style.top = (above ? Math.max(8, r.top - pop.offsetHeight - 6) : r.bottom + 6) + "px";
}

function openNewMenu() {
  openPop($("new-btn"), (pop) => {
    [["📄", "Page", "doc", null], ["🗂️", "Board", "board", null], ["📅", "Weekly board", "board", "week"]].forEach(([icon, label, type, template]) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = icon + "  " + label;
      b.onclick = () => { closePop(); newPage(type, template, null); };
      pop.appendChild(b);
    });
  }, true);
}

const EMOJIS = ["📄", "📝", "📚", "🗂️", "📅", "✅", "🎯", "💡", "🚀", "⭐", "🔥", "💼", "🏠", "🎓", "💪", "🎨", "🛒", "✈️", "🍎", "❤️", "🎵", "🧠", "💰", "🌱"];

function openEmojiPicker(anchor) {
  openPop(anchor, (pop) => {
    const grid = document.createElement("div");
    grid.className = "emoji-grid";
    EMOJIS.forEach((emoji) => {
      const b = document.createElement("button");
      b.textContent = emoji;
      b.onclick = () => {
        closePop();
        current.icon = emoji;
        const meta = pages.find((p) => p.id === current.id);
        if (meta) meta.icon = emoji;
        anchor.textContent = emoji;
        renderTree();
        renderCrumbs();
        scheduleSave(true);
      };
      grid.appendChild(b);
    });
    pop.appendChild(grid);
  }, false);
}

document.addEventListener("click", (e) => {
  if (!$("pop").hidden && !$("pop").contains(e.target) && e.target !== $("new-btn") && !e.target.classList.contains("page-icon")) closePop();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePop(); });

// ---------- Buttons and routing ----------
$("new-btn").onclick = () => { if ($("pop").hidden) openNewMenu(); else closePop(); };
$("delete-btn").onclick = deleteCurrent;
$("search").addEventListener("input", renderTree);
$("menu-btn").onclick = () => $("shell").classList.toggle("nav-open");
$("logout").onclick = async () => {
  await flushSave();
  await fetch("/api/auth/logout", { method: "POST" });
  location.href = "/login.html";
};

// Do not lose changes if the tab is closed right after typing
window.addEventListener("beforeunload", (e) => { if (dirty && !failed) { e.preventDefault(); e.returnValue = ""; } });

window.addEventListener("hashchange", () => {
  const id = location.hash.replace("#/", "");
  if (id) loadPage(id);
});

// ---------- Start: who am I? then load my pages ----------
(async function start() {
  const user = await api("/api/auth/me");
  stats = user.stats;
  $("user-name").textContent = user.name;
  $("avatar").textContent = user.name.trim().charAt(0).toUpperCase();
  $("user-email").textContent = user.email;
  renderPlayer(stats, false);

  pages = await api("/api/pages");
  const wanted = location.hash.replace("#/", "");
  const first = pages.find((p) => p.id === wanted) || pages.find((p) => !p.parentId) || pages[0];
  if (first) {
    if (location.hash !== "#/" + first.id) location.hash = "#/" + first.id;   // opens it
    else loadPage(first.id);
  } else {
    showEmpty();
  }
})();
