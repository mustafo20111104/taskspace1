// DOCUMENT EDITOR: a page made of blocks (text, headings, to-dos, lists, quotes...).
//
// How it works:
//   - "content.blocks" is a list like [{ id, type, text, checked }]
//   - every block is drawn as a row with a textarea
//   - the editor changes content.blocks directly, then calls onChange()
//   - app.js saves the content to the server (auto-save)
//
// Keys: Enter = new block, Backspace at start = turn into text / join with the previous block,
//       "/" = block menu, "# ", "- ", "1. ", "[] ", "> ", "```", "---" = shortcuts.

const DocEditor = (() => {
  // The block types in the "/" menu. "keys" are extra words you can type to find them.
  const TYPES = [
    { type: "p",        label: "Text",          hint: "Plain text",          icon: "¶",   keys: "paragraph plain" },
    { type: "h1",       label: "Heading 1",     hint: "Big heading",         icon: "H1",  keys: "title h1 heading1" },
    { type: "h2",       label: "Heading 2",     hint: "Medium heading",      icon: "H2",  keys: "h2 heading2" },
    { type: "h3",       label: "Heading 3",     hint: "Small heading",       icon: "H3",  keys: "h3 heading3" },
    { type: "todo",     label: "To-do list",    hint: "Tick it to earn XP",  icon: "☑",   keys: "task checkbox todo" },
    { type: "bullet",   label: "Bulleted list", hint: "A simple list",       icon: "•",   keys: "ul list bullet" },
    { type: "numbered", label: "Numbered list", hint: "A list with numbers", icon: "1.",  keys: "ol list number" },
    { type: "quote",    label: "Quote",         hint: "Highlight a thought", icon: "❝",   keys: "callout" },
    { type: "code",     label: "Code",          hint: "Monospace text",      icon: "</>", keys: "snippet" },
    { type: "divider",  label: "Divider",       hint: "A thin line",         icon: "—",   keys: "line hr separator" }
  ];

  const PLACEHOLDERS = {
    p: "Type '/' for commands", h1: "Heading 1", h2: "Heading 2", h3: "Heading 3", todo: "To-do",
    bullet: "List item", numbered: "List item", quote: "Quote", code: "Code"
  };

  // Typing these at the start of an empty-ish text block changes its type
  const SHORTCUTS = [
    [/^### /, "h3"], [/^## /, "h2"], [/^# /, "h1"], [/^[-*] /, "bullet"],
    [/^1\. /, "numbered"], [/^\[ ?\] /, "todo"], [/^> /, "quote"]
  ];

  function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }
  function el(tag, className) { const e = document.createElement(tag); if (className) e.className = className; return e; }
  function newBlock(type, text) { return { id: uid(), type, text: text || "", checked: false }; }
  function autosize(ta) { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + "px"; }

  function mount(container, content, onChange) {
    if (!Array.isArray(content.blocks) || !content.blocks.length) content.blocks = [newBlock("p")];
    const blocks = content.blocks;             // changed in place

    container.innerHTML = "";
    const list = el("div", "doc");
    const end = el("div", "doc-end");          // click below the last block to write more
    container.append(list, end);

    let menu = null;                           // the open "/" menu: { box, block, items, active }

    const changed = (immediate) => onChange(immediate);
    const indexOf = (id) => blocks.findIndex((b) => b.id === id);

    function insertAfter(id, block) { blocks.splice(indexOf(id) + 1, 0, block); }
    function removeBlock(id) {
      blocks.splice(indexOf(id), 1);
      if (!blocks.length) blocks.push(newBlock("p"));
    }

    // ---------- Drawing ----------
    function render() {
      closeMenu();
      list.innerHTML = "";
      let number = 0;
      blocks.forEach((b) => {
        number = b.type === "numbered" ? number + 1 : 0;
        list.appendChild(makeRow(b, number));
      });
      list.querySelectorAll("textarea").forEach(autosize);
    }

    function makeRow(b, number) {
      const row = el("div", "block " + b.type + (b.type === "todo" && b.checked ? " done" : ""));
      row.dataset.id = b.id;

      const tools = el("div", "b-tools");
      const add = el("button"); add.textContent = "+"; add.title = "Add a block below"; add.type = "button";
      add.onclick = () => { const nb = newBlock("p"); insertAfter(b.id, nb); render(); focusBlock(nb.id, 0); changed(); };
      const del = el("button"); del.textContent = "×"; del.title = "Delete this block"; del.type = "button";
      del.onclick = () => { removeBlock(b.id); render(); changed(); };
      tools.append(add, del);
      row.appendChild(tools);

      if (b.type === "divider") {
        row.appendChild(el("hr"));
        return row;
      }

      const body = el("div", "b-body");
      if (b.type === "todo") {
        const box = el("input"); box.type = "checkbox"; box.checked = Boolean(b.checked);
        box.setAttribute("aria-label", "Done");
        box.onchange = () => {
          b.checked = box.checked;
          row.classList.toggle("done", box.checked);
          changed(true);                       // save right away so the XP shows up
        };
        body.appendChild(box);
      } else if (b.type === "bullet") {
        const m = el("span", "mark"); m.textContent = "•"; body.appendChild(m);
      } else if (b.type === "numbered") {
        const m = el("span", "mark"); m.textContent = number + "."; body.appendChild(m);
      }

      const ta = el("textarea");
      ta.rows = 1;
      ta.value = b.text || "";
      ta.placeholder = PLACEHOLDERS[b.type] || "";
      ta.setAttribute("aria-label", PLACEHOLDERS[b.type] || "Text");
      ta.addEventListener("input", () => onInput(b, ta));
      ta.addEventListener("keydown", (e) => onKey(e, b, ta));
      ta.addEventListener("paste", (e) => onPaste(e, b, ta));
      ta.addEventListener("blur", () => setTimeout(closeMenu, 150));
      body.appendChild(ta);
      row.appendChild(body);
      return row;
    }

    function focusBlock(id, pos) {
      const row = list.querySelector('[data-id="' + id + '"]');
      const ta = row && row.querySelector("textarea");
      if (!ta) return;
      ta.focus();
      const p = pos === "end" ? ta.value.length : pos;
      ta.setSelectionRange(p, p);
    }

    // ---------- Typing ----------
    function onInput(b, ta) {
      b.text = ta.value;
      autosize(ta);

      if (b.type === "p") {
        const v = ta.value;
        for (const [re, type] of SHORTCUTS) {
          if (re.test(v)) { b.type = type; b.text = v.replace(re, ""); render(); focusBlock(b.id, 0); changed(); return; }
        }
        if (v === "```") { b.type = "code"; b.text = ""; render(); focusBlock(b.id, 0); changed(); return; }
        if (v === "---") { turnIntoDivider(b); changed(); return; }
      }
      updateMenu(b, ta);
      changed();
    }

    function turnIntoDivider(b) {
      b.type = "divider"; b.text = "";
      const nb = newBlock("p");
      insertAfter(b.id, nb);
      render();
      focusBlock(nb.id, 0);
    }

    function onKey(e, b, ta) {
      if (menu && menuKey(e)) return;

      const atStart = ta.selectionStart === 0 && ta.selectionEnd === 0;
      const atEnd = ta.selectionStart === ta.value.length && ta.selectionEnd === ta.value.length;

      // Enter: a new block (Shift+Enter or a code block: a new line)
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && b.type !== "code") {
        e.preventDefault();
        const isList = ["todo", "bullet", "numbered"].includes(b.type);
        if (isList && ta.value === "") {            // Enter on an empty list item ends the list
          b.type = "p"; render(); focusBlock(b.id, 0); changed(); return;
        }
        const before = ta.value.slice(0, ta.selectionStart);
        const after = ta.value.slice(ta.selectionEnd);
        b.text = before;
        const nb = newBlock(isList ? b.type : "p", after);
        insertAfter(b.id, nb);
        render();
        focusBlock(nb.id, 0);
        changed();
        return;
      }

      // Backspace at the start: turn into text, or join with the block above
      if (e.key === "Backspace" && atStart) {
        if (b.type !== "p") {
          e.preventDefault(); b.type = "p"; render(); focusBlock(b.id, 0); changed(); return;
        }
        const i = indexOf(b.id);
        if (i > 0) {
          e.preventDefault();
          const prev = blocks[i - 1];
          if (prev.type === "divider") {
            blocks.splice(i - 1, 1); render(); focusBlock(b.id, 0);
          } else {
            const pos = (prev.text || "").length;
            prev.text = (prev.text || "") + b.text;
            blocks.splice(i, 1);
            render();
            focusBlock(prev.id, pos);
          }
          changed();
          return;
        }
      }

      // Arrow keys at the edges move to the next or previous block
      if (e.key === "ArrowUp" && atStart) moveFocus(b.id, -1, e);
      if (e.key === "ArrowDown" && atEnd) moveFocus(b.id, 1, e);
    }

    function moveFocus(id, step, e) {
      let i = indexOf(id) + step;
      while (blocks[i] && blocks[i].type === "divider") i += step;
      if (!blocks[i]) return;
      e.preventDefault();
      focusBlock(blocks[i].id, step < 0 ? "end" : 0);
    }

    // Pasting several lines makes several blocks
    function onPaste(e, b, ta) {
      if (b.type === "code") return;
      const text = (e.clipboardData || window.clipboardData).getData("text");
      if (!text.includes("\n")) return;
      e.preventDefault();
      const lines = text.replace(/\r/g, "").split("\n");
      const before = ta.value.slice(0, ta.selectionStart);
      const after = ta.value.slice(ta.selectionEnd);
      const isList = ["todo", "bullet", "numbered"].includes(b.type);
      b.text = before + lines[0];
      let prev = b;
      lines.slice(1).forEach((line, k) => {
        const last = k === lines.length - 2;
        const nb = newBlock(isList ? b.type : "p", last ? line + after : line);
        insertAfter(prev.id, nb);
        prev = nb;
      });
      render();
      focusBlock(prev.id, lines[lines.length - 1].length);
      changed();
    }

    // ---------- The "/" menu ----------
    function updateMenu(b, ta) {
      const v = ta.value;
      if (!v.startsWith("/") || v.includes("\n")) { closeMenu(); return; }
      const q = v.slice(1).toLowerCase();
      const items = TYPES.filter((t) => !q || t.label.toLowerCase().includes(q) || t.keys.includes(q) || t.type.startsWith(q));
      if (!items.length) { closeMenu(); return; }
      openMenu(b, items);
    }

    function openMenu(b, items) {
      const row = list.querySelector('[data-id="' + b.id + '"]');
      if (!row) return;
      closeMenu();
      const box = el("div", "slash");
      box.setAttribute("role", "listbox");
      menu = { box, block: b, items, active: 0 };
      items.forEach((item, i) => {
        const btn = el("button"); btn.type = "button";
        if (i === 0) btn.className = "on";
        const icon = el("span", "s-icon"); icon.textContent = item.icon;
        const text = el("span");
        const name = el("span"); name.textContent = item.label;
        const hint = el("small"); hint.textContent = item.hint;
        text.append(name, hint);
        btn.append(icon, text);
        btn.addEventListener("mousedown", (e) => e.preventDefault());   // keep the cursor in the text
        btn.addEventListener("click", () => choose(b, item));
        box.appendChild(btn);
      });
      row.appendChild(box);
    }

    function closeMenu() {
      if (menu) { menu.box.remove(); menu = null; }
    }

    function menuKey(e) {
      if (e.key === "Escape") { e.preventDefault(); closeMenu(); return true; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const n = menu.items.length;
        menu.active = (menu.active + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
        [...menu.box.children].forEach((c, i) => c.classList.toggle("on", i === menu.active));
        menu.box.children[menu.active].scrollIntoView({ block: "nearest" });
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        choose(menu.block, menu.items[menu.active]);
        return true;
      }
      return false;
    }

    function choose(b, item) {
      closeMenu();
      if (item.type === "divider") {
        turnIntoDivider(b);
      } else {
        b.type = item.type;
        b.text = "";
        render();
        focusBlock(b.id, 0);
      }
      changed();
    }

    // ---------- Click below the last block ----------
    end.addEventListener("click", () => {
      const last = blocks[blocks.length - 1];
      if (last.type === "p" && !last.text) { focusBlock(last.id, "end"); return; }
      const nb = newBlock("p");
      blocks.push(nb);
      render();
      focusBlock(nb.id, 0);
      changed();
    });

    render();
    return { focusFirst() { focusBlock(blocks[0].id, "end"); } };
  }

  return { mount };
})();
