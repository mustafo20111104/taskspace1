// BOARD EDITOR (Kanban): columns with cards you can drag between columns.
//
// "content" looks like: { columns: [{ id, name, done }], cards: [{ id, text, col }] }
//   - a column with done = true is a "Done" column: moving a card there earns XP
//   - the editor changes content directly, then calls onChange()

const BoardEditor = (() => {
  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }
  function el(tag, className) { const e = document.createElement(tag); if (className) e.className = className; return e; }
  function button(text, title, onClick) {
    const b = el("button"); b.type = "button"; b.textContent = text; b.title = title; b.setAttribute("aria-label", title);
    b.onclick = onClick;
    return b;
  }

  function mount(container, content, onChange) {
    if (!Array.isArray(content.columns) || !content.columns.length) content.columns = [{ id: uid(), name: "To do", done: false }];
    if (!Array.isArray(content.cards)) content.cards = [];
    const changed = (immediate) => onChange(immediate);

    container.innerHTML = "";
    const hint = el("p", "board-hint");
    hint.textContent = "Drag cards between columns. Cards in a ✓ column are finished and earn 10 XP.";
    const board = el("div", "board");
    container.append(hint, board);

    // ---------- Drawing ----------
    function render() {
      board.innerHTML = "";
      content.columns.forEach((col, index) => board.appendChild(makeColumn(col, index)));

      const addCol = el("button", "add-col"); addCol.type = "button"; addCol.textContent = "+ Add column";
      addCol.onclick = () => {
        content.columns.push({ id: uid(), name: "New column", done: false });
        render();
        const inputs = board.querySelectorAll(".col-name");
        const last = inputs[inputs.length - 1];
        last.focus(); last.select();
        changed();
      };
      board.appendChild(addCol);
    }

    function makeColumn(col, index) {
      const box = el("section", "col");
      box.dataset.id = col.id;
      const cards = content.cards.filter((c) => c.col === col.id);

      const head = el("div", "col-head");
      const name = el("input", "col-name");
      name.value = col.name; name.maxLength = 40; name.setAttribute("aria-label", "Column name");
      name.addEventListener("input", () => { col.name = name.value; changed(); });
      head.appendChild(name);
      if (col.done) { const ok = el("span", "col-done"); ok.textContent = "✓"; ok.title = "Cards here are finished"; head.appendChild(ok); }
      const count = el("span", "col-count"); count.textContent = cards.length; head.appendChild(count);
      if (content.columns.length > 1) {
        head.appendChild(button("×", "Delete column", () => {
          if (cards.length && !confirm("Delete this column and its " + cards.length + " card(s)?")) return;
          content.cards = content.cards.filter((c) => c.col !== col.id);
          content.columns.splice(index, 1);
          render();
          changed();
        }));
      }
      box.appendChild(head);

      const list = el("div", "cards");
      cards.forEach((card) => list.appendChild(makeCard(card, col, index)));
      box.appendChild(list);

      const add = el("input", "add-card");
      add.placeholder = "+ Add a card"; add.maxLength = 300; add.setAttribute("aria-label", "Add a card to " + col.name);
      add.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && add.value.trim()) {
          content.cards.push({ id: uid(), text: add.value.trim(), col: col.id });
          render();
          const again = board.querySelector('[data-id="' + col.id + '"] .add-card');
          if (again) again.focus();
          changed(col.done);
        }
      });
      box.appendChild(add);

      // Dropping a card on this column
      box.addEventListener("dragover", (e) => { e.preventDefault(); box.classList.add("over"); });
      box.addEventListener("dragleave", (e) => { if (!box.contains(e.relatedTarget)) box.classList.remove("over"); });
      box.addEventListener("drop", (e) => {
        e.preventDefault();
        box.classList.remove("over");
        lastPoint = { x: e.clientX, y: e.clientY };           // the "+XP" text appears here
        const id = e.dataTransfer.getData("text/plain");
        const card = content.cards.find((c) => c.id === id);
        if (!card) return;
        const before = cardBefore(list, e.clientY);          // the card we dropped above (or null = end)
        content.cards.splice(content.cards.indexOf(card), 1);
        card.col = col.id;
        const target = before ? content.cards.findIndex((c) => c.id === before) : -1;
        if (target > -1) content.cards.splice(target, 0, card);
        else content.cards.push(card);
        render();
        changed(true);
      });
      return box;
    }

    // Which card is right below the mouse? (to place the dropped card above it)
    function cardBefore(list, y) {
      const els = [...list.querySelectorAll(".card:not(.dragging)")];
      for (const c of els) {
        const r = c.getBoundingClientRect();
        if (y < r.top + r.height / 2) return c.dataset.id;
      }
      return null;
    }

    function makeCard(card, col, colIndex) {
      const box = el("div", "card" + (col.done ? " in-done" : ""));
      box.dataset.id = card.id;
      box.draggable = true;
      box.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "move";
        setTimeout(() => box.classList.add("dragging"), 0);
      });
      box.addEventListener("dragend", () => box.classList.remove("dragging"));

      const text = el("div", "card-text");
      text.textContent = card.text;
      text.title = "Click to edit";
      text.onclick = () => edit(box, text, card);
      box.appendChild(text);

      // Buttons (also work on phones, where dragging is hard)
      const tools = el("div", "card-tools");
      if (colIndex > 0) tools.appendChild(button("◀", "Move left", () => move(card, content.columns[colIndex - 1])));
      if (colIndex < content.columns.length - 1) tools.appendChild(button("▶", "Move right", (e) => { lastPoint = { x: e.clientX, y: e.clientY }; move(card, content.columns[colIndex + 1]); }));
      tools.appendChild(button("×", "Delete card", () => {
        content.cards.splice(content.cards.indexOf(card), 1);
        render();
        changed();
      }));
      box.appendChild(tools);
      return box;
    }

    function move(card, col) {
      content.cards.splice(content.cards.indexOf(card), 1);
      card.col = col.id;
      content.cards.push(card);
      render();
      changed(true);
    }

    function edit(box, textEl, card) {
      const ta = el("textarea", "card-edit");
      ta.value = card.text; ta.rows = 2; ta.maxLength = 300;
      box.draggable = false;
      textEl.replaceWith(ta);
      ta.focus(); ta.select();
      let finished = false;
      const finish = (save) => {
        if (finished) return;
        finished = true;
        if (save && ta.value.trim()) { card.text = ta.value.trim(); changed(); }
        render();
      };
      ta.addEventListener("blur", () => finish(true));
      ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finish(true); }
        if (e.key === "Escape") finish(false);
      });
    }

    render();
  }

  return { mount };
})();
