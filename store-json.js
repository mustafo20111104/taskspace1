// STORE 1: JSON files (for running on your own computer).

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "data");

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DIR, name), "utf8"));
  } catch (err) {
    return []; // file does not exist yet
  }
}

function write(name, data) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(path.join(DIR, name), JSON.stringify(data, null, 2));
}

module.exports = {
  // ----- users -----
  async findUserByEmail(email) {
    return read("users.json").find((u) => u.email === email) || null;
  },
  async findUserById(id) {
    return read("users.json").find((u) => u.id === id) || null;
  },
  async createUser(user) {
    const users = read("users.json");
    users.push(user);
    write("users.json", users);
  },
  async saveUserStats(user) {
    const users = read("users.json");
    const saved = users.find((u) => u.id === user.id);
    if (saved) {
      saved.xp = user.xp || 0;
      saved.streak = user.streak || 0;
      saved.lastDoneDate = user.lastDoneDate || null;
      saved.xpDate = user.xpDate || null;
      saved.xpToday = user.xpToday || 0;
      write("users.json", users);
    }
  },

  // ----- pages -----
  // list: only the small info needed for the sidebar (no content)
  async listPages(userId) {
    return read("pages.json")
      .filter((p) => p.userId === userId)
      .map((p) => ({ id: p.id, parentId: p.parentId, title: p.title, icon: p.icon, type: p.type, updatedAt: p.updatedAt }));
  },
  async getPage(id, userId) {
    return read("pages.json").find((p) => p.id === id && p.userId === userId) || null;
  },
  async createPage(page) {
    const pages = read("pages.json");
    pages.push(page);
    write("pages.json", pages);
  },
  async createPages(list) {
    const pages = read("pages.json");
    write("pages.json", pages.concat(list));
  },
  async savePage(page) {
    const pages = read("pages.json");
    const index = pages.findIndex((p) => p.id === page.id && p.userId === page.userId);
    if (index > -1) {
      pages[index] = page;
      write("pages.json", pages);
    }
  },
  async deletePages(ids, userId) {
    write("pages.json", read("pages.json").filter((p) => !(ids.includes(p.id) && p.userId === userId)));
  }
};
