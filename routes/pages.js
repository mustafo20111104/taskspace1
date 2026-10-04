// PAGE ROUTES: pages (documents and boards). Every page belongs to one user.

const express = require("express");
const db = require("../store-supabase");
const game = require("../game");
const content = require("../content");
const templates = require("../templates");
const { requireLogin, wrap } = require("../authMiddleware");

const router = express.Router();
router.use(requireLogin); // all routes below need login

const MAX_PAGES = 300;

// GET /api/pages -> the page list for the sidebar (no content)
router.get("/", wrap(async (req, res) => {
  res.json(await db.listPages(req.user.id));
}));

// POST /api/pages  { type: "doc" | "board", template: "week", parentId }
router.post("/", wrap(async (req, res) => {
  const type = req.body.type === "board" ? "board" : "doc";
  const parentId = req.body.parentId ? String(req.body.parentId) : null;

  const existing = await db.listPages(req.user.id);
  if (existing.length >= MAX_PAGES) return res.status(400).json({ error: "Page limit reached." });
  if (parentId && !existing.some((p) => p.id === parentId)) {
    return res.status(400).json({ error: "Parent page not found." });
  }

  let page;
  if (type === "board") {
    const week = req.body.template === "week";
    page = templates.page(req.user.id, parentId, week ? "Week" : "", week ? "📅" : "🗂️", "board", templates.newBoard(req.body.template));
  } else {
    page = templates.page(req.user.id, parentId, "", "📄", "doc", templates.newDoc());
  }
  await db.createPage(page);
  res.status(201).json(page);
}));

// GET /api/pages/:id -> one page with its content
router.get("/:id", wrap(async (req, res) => {
  const page = await db.getPage(req.params.id, req.user.id);
  if (!page) return res.status(404).json({ error: "Page not found" });
  res.json(page);
}));

// PUT /api/pages/:id  { title, icon, content, today }
// Saves the page. Finishing items for the first time gives XP.
router.put("/:id", wrap(async (req, res) => {
  const page = await db.getPage(req.params.id, req.user.id);
  if (!page) return res.status(404).json({ error: "Page not found" });

  if (typeof req.body.title === "string") page.title = req.body.title.slice(0, 100);
  if (typeof req.body.icon === "string" && req.body.icon.trim()) page.icon = [...req.body.icon.trim()].slice(0, 4).join("");

  let newlyDone = 0;
  if (req.body.content && typeof req.body.content === "object") {
    const cleaned = content.clean(page.type, req.body.content, page.content);
    // An item that is done and has no XP mark yet was finished for the first time
    content.items(page.type, cleaned).forEach((item) => {
      if (item.done && !item.ref.xp) {
        item.ref.xp = game.XP_PER_ITEM;
        newlyDone++;
      }
    });
    page.content = cleaned;
  }
  page.updatedAt = new Date().toISOString();

  const result = game.reward(req.user, newlyDone, req.body.today);
  await db.savePage(page);
  if (newlyDone > 0) await db.saveUserStats(req.user);

  res.json({ updatedAt: page.updatedAt, stats: game.statsOf(req.user), gained: result.gained, capped: result.capped });
}));

// DELETE /api/pages/:id -> deletes the page and all its sub-pages
router.delete("/:id", wrap(async (req, res) => {
  const all = await db.listPages(req.user.id);
  if (!all.some((p) => p.id === req.params.id)) return res.status(404).json({ error: "Page not found" });

  const ids = [req.params.id];
  for (let i = 0; i < ids.length; i++) {
    all.filter((p) => p.parentId === ids[i]).forEach((child) => ids.push(child.id));
  }
  await db.deletePages(ids, req.user.id);
  res.json({ deleted: ids });
}));

module.exports = router;
