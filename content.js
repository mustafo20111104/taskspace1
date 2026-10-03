// CONTENT CHECKS: the browser sends the whole page content when it saves.
// We never trust it blindly: we rebuild it field by field, cut lengths,
// and take the XP marks from the saved version, never from the browser.

const { uid } = require("./templates");

const BLOCK_TYPES = ["p", "h1", "h2", "h3", "todo", "bullet", "numbered", "quote", "code", "divider"];

const cleanId = (v) => String(v || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);

// Collect "xp" marks of the old version, by item id
function oldMarks(oldContent) {
  const marks = {};
  const list = [].concat((oldContent && oldContent.blocks) || [], (oldContent && oldContent.cards) || []);
  list.forEach((item) => { if (item && item.xp) marks[item.id] = item.xp; });
  return marks;
}

function uniqueId(seen, wanted) {
  let id = cleanId(wanted);
  if (!id || seen.has(id)) id = uid();
  seen.add(id);
  return id;
}

function cleanDoc(content, oldContent) {
  const marks = oldMarks(oldContent);
  const seen = new Set();
  const input = Array.isArray(content && content.blocks) ? content.blocks.slice(0, 1000) : [];
  const blocks = input.map((b) => {
    const type = BLOCK_TYPES.includes(b && b.type) ? b.type : "p";
    const out = {
      id: uniqueId(seen, b && b.id),
      type,
      text: type === "divider" ? "" : String((b && b.text) || "").slice(0, 5000),
      checked: type === "todo" && Boolean(b && b.checked)
    };
    if (marks[out.id]) out.xp = marks[out.id];
    return out;
  });
  if (!blocks.length) blocks.push({ id: uid(), type: "p", text: "", checked: false });
  return { blocks };
}

function cleanBoard(content, oldContent) {
  const marks = oldMarks(oldContent);
  const oldDone = {};   // only columns that were already "Done" columns stay Done columns
  ((oldContent && oldContent.columns) || []).forEach((c) => { oldDone[c.id] = Boolean(c.done); });

  const seen = new Set();
  const inputCols = Array.isArray(content && content.columns) ? content.columns.slice(0, 20) : [];
  const columns = inputCols.map((c) => {
    const id = uniqueId(seen, c && c.id);
    return { id, name: String((c && c.name) || "").slice(0, 40), done: Boolean(oldDone[id]) };
  });
  if (!columns.length) columns.push({ id: uid(), name: "To do", done: false });

  const colIds = new Set(columns.map((c) => c.id));
  const seenCards = new Set();
  const inputCards = Array.isArray(content && content.cards) ? content.cards.slice(0, 1000) : [];
  const cards = inputCards.map((c) => {
    const out = {
      id: uniqueId(seenCards, c && c.id),
      text: String((c && c.text) || "").slice(0, 300),
      col: colIds.has(c && c.col) ? c.col : columns[0].id
    };
    if (marks[out.id]) out.xp = marks[out.id];
    return out;
  });
  return { columns, cards };
}

function clean(type, content, oldContent) {
  return type === "board" ? cleanBoard(content, oldContent) : cleanDoc(content, oldContent);
}

// The items that can earn XP: to-do blocks, or cards in a Done column
function items(type, content) {
  if (type === "board") {
    const doneCols = new Set((content.columns || []).filter((c) => c.done).map((c) => c.id));
    return (content.cards || []).map((card) => ({ done: doneCols.has(card.col), ref: card }));
  }
  return (content.blocks || []).filter((b) => b.type === "todo").map((b) => ({ done: b.checked, ref: b }));
}

module.exports = { clean, items };
