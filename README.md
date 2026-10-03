# Taskspace

A Notion-style workspace with a game on top.

- **Pages and sub-pages** in a sidebar (with search)
- **Block editor**: type `/` for text, headings, to-dos, bullet and numbered lists, quotes, code, dividers
- **Boards** (Kanban): drag cards between columns, plus a ready-made Weekly board (Mon to Sun)
- **Game**: XP, levels and a daily streak
- Accounts: sign up, login, every user sees only their own pages
- Auto-save, light and dark theme, works on phones

**Frontend** = plain HTML, CSS and JavaScript (`public/`). **Backend** = Node.js + Express.

## Editor shortcuts

| Type | Result |
|------|--------|
| `/` | block menu (arrow keys + Enter) |
| `# `, `## `, `### ` | headings |
| `- ` or `* ` | bullet list |
| `1. ` | numbered list |
| `[] ` | to-do |
| `> ` | quote |
| ` ``` ` | code block |
| `---` | divider |
| Enter / Backspace at the start | new block / turn into text or join with the block above |

## The game

| Action | Result |
|--------|--------|
| Tick a to-do, or move a card into a Done column (marked with a check) | +10 XP, the first time only |
| Tick the same item again | no new XP (no farming) |
| Daily limit | 200 XP per day |
| Every 100 XP | +1 level (Beginner, Planner, Organizer, Achiever, Focus Master, Legend) |
| Finish at least 1 new item per day | the daily streak grows; miss a day and it restarts |

The rules are enforced on the server (`game.js`, `content.js`), so the browser cannot fake points.

## Folder structure

```
taskspace/
├── server.js            starts the server
├── game.js              XP, level and streak rules
├── content.js           checks and cleans page content before saving
├── templates.js         new page / board / starter pages
├── db.js                picks the storage: JSON files or Supabase
├── store-json.js        storage 1: files in data/ (on your computer)
├── store-supabase.js    storage 2: Supabase database (online)
├── middleware.js        login check + cookie
├── supabase-setup.sql   run once in Supabase to create the tables
├── routes/
│   ├── auth.js          register, login, logout, me
│   └── pages.js         pages: list, create, open, save, delete
└── public/
    ├── index.html       the app page
    ├── login.html       login page
    ├── register.html    sign up page
    ├── style.css        design
    ├── auth.css         animated login / sign up design
    ├── effects.js       confetti, "+XP", toasts, level-up, player card
    ├── editor.js        the block editor
    ├── board.js         the Kanban board
    ├── app.js           sidebar, opening pages, auto-save
    └── auth.js          login / register logic
```

## Run on your computer

```
npm install
npm start
```

Open http://localhost:3000 and create an account. Data is saved in the `data` folder.

## API

| Method | URL | What it does |
|--------|-----|--------------|
| POST   | /api/auth/register | create account `{ name, email, password }` |
| POST   | /api/auth/login    | log in |
| POST   | /api/auth/logout   | log out |
| GET    | /api/auth/me       | current user + stats |
| GET    | /api/pages         | page list for the sidebar |
| POST   | /api/pages         | new page `{ type: "doc" or "board", template: "week", parentId }` |
| GET    | /api/pages/:id     | one page with content |
| PUT    | /api/pages/:id     | save `{ title, icon, content, today }`, returns `{ stats, gained }` |
| DELETE | /api/pages/:id     | delete a page and its sub-pages |

## Put it online

See `VERCEL-SETUP.md`.
