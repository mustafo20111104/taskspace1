// TEMPLATES: what a new page, a new board and the starter pages look like.

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function block(type, text, checked) {
  return { id: uid(), type, text: text || "", checked: Boolean(checked) };
}

function newDoc() {
  return { blocks: [block("p", "")] };
}

// template "week" -> Monday to Sunday + Done, otherwise To do / Doing / Done
function newBoard(template) {
  const names = template === "week"
    ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    : ["To do", "Doing"];
  const columns = names.map((name) => ({ id: uid(), name, done: false }));
  columns.push({ id: uid(), name: "Done", done: true });   // cards moved here earn XP
  return { columns, cards: [] };
}

function page(userId, parentId, title, icon, type, content) {
  const now = new Date().toISOString();
  return { id: uid(), userId, parentId, title, icon, type, content, createdAt: now, updatedAt: now };
}

// Pages every new account starts with
function starterPages(userId) {
  const welcome = page(userId, null, "Welcome", "👋", "doc", {
    blocks: [
      block("h1", "Welcome to your workspace"),
      block("p", "Type / on an empty line to add headings, lists, to-dos, quotes and more."),
      block("todo", "Tick this to-do to earn 10 XP"),
      block("todo", "Add your own to-do: press Enter after this one"),
      block("h2", "Good to know"),
      block("bullet", "Pages live in the sidebar. Use the + next to a page to add a sub-page."),
      block("bullet", "Shortcuts: type # for a heading, - for a list, [] for a to-do, > for a quote."),
      block("bullet", "Boards let you drag cards between columns. Cards in Done earn XP."),
      block("quote", "Finish things, earn XP, keep your streak alive.")
    ]
  });

  const ideas = page(userId, welcome.id, "Ideas", "💡", "doc", {
    blocks: [block("h2", "Ideas"), block("bullet", "This is a sub-page of Welcome."), block("p", "")]
  });

  const board = newBoard();
  const [todo, doing] = board.columns;
  board.cards = [
    { id: uid(), text: "Drag me to Doing", col: todo.id },
    { id: uid(), text: "Then drag me to Done for 10 XP", col: todo.id },
    { id: uid(), text: "Click a card to edit it", col: doing.id }
  ];
  const myBoard = page(userId, null, "My board", "🗂️", "board", board);

  // different creation times keep the sidebar order stable
  return [welcome, ideas, myBoard].map((p, i) => Object.assign(p, { createdAt: new Date(Date.now() + i).toISOString() }));
}

module.exports = { uid, newDoc, newBoard, page, starterPages };
