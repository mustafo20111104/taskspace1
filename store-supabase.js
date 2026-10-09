// STORE 2: Supabase database (for putting the site online).
// The tables are created by supabase-setup.sql.
// The secret key stays on the server only. Never put it in the frontend.

const { createClient } = require("@supabase/supabase-js");

// TEMPORARY: log only the runtime URL pathname while diagnosing production config.
let supabaseUrlPath = "/";
try {
  supabaseUrlPath = new URL(process.env.SUPABASE_URL).pathname || "/";
} catch {
  supabaseUrlPath = "UNPARSEABLE";
}
console.log("SUPABASE_URL_RUNTIME_PATH=" + supabaseUrlPath);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// If Supabase answers with an error, stop and report it
function check({ data, error }) {
  if (error) {
    const databaseError = new Error("Database error: " + error.message);
    databaseError.code = error.code;
    throw databaseError;
  }
  return data;
}

// The database uses snake_case names, the app uses camelCase. These convert.
function userFromRow(r) {
  return r && {
    id: r.id, name: r.name, email: r.email, passwordHash: r.password_hash,
    xp: r.xp, streak: r.streak, lastDoneDate: r.last_done_date,
    xpDate: r.xp_date, xpToday: r.xp_today, createdAt: r.created_at
  };
}
function pageFromRow(r) {
  return r && {
    id: r.id, userId: r.user_id, parentId: r.parent_id, title: r.title, icon: r.icon,
    type: r.type, content: r.content, createdAt: r.created_at, updatedAt: r.updated_at
  };
}
function pageToRow(p) {
  return {
    id: p.id, user_id: p.userId, parent_id: p.parentId, title: p.title, icon: p.icon,
    type: p.type, content: p.content, created_at: p.createdAt, updated_at: p.updatedAt
  };
}

module.exports = {
  // ----- users -----
  async findUserByEmail(email) {
    return userFromRow(check(await supabase.from("users").select("*").eq("email", email).maybeSingle()));
  },
  async findUserById(id) {
    return userFromRow(check(await supabase.from("users").select("*").eq("id", id).maybeSingle()));
  },
  async createUser(user) {
    return userFromRow(check(await supabase.from("users").insert({
      id: user.id, name: user.name, email: user.email,
      password_hash: user.passwordHash, created_at: user.createdAt
    }).select("*").single()));
  },
  async deleteUser(id) {
    check(await supabase.from("users").delete().eq("id", id));
  },
  async saveUserStats(user) {
    check(await supabase.from("users").update({
      xp: user.xp || 0, streak: user.streak || 0, last_done_date: user.lastDoneDate || null,
      xp_date: user.xpDate || null, xp_today: user.xpToday || 0
    }).eq("id", user.id));
  },

  // ----- pages -----
  async listPages(userId) {
    const rows = check(await supabase.from("pages")
      .select("id,parent_id,title,icon,type,updated_at").eq("user_id", userId).order("created_at"));
    return rows.map((r) => ({ id: r.id, parentId: r.parent_id, title: r.title, icon: r.icon, type: r.type, updatedAt: r.updated_at }));
  },
  async getPage(id, userId) {
    return pageFromRow(check(await supabase.from("pages").select("*").eq("id", id).eq("user_id", userId).maybeSingle()));
  },
  async createPage(page) {
    check(await supabase.from("pages").insert(pageToRow(page)));
  },
  async createPages(list) {
    check(await supabase.from("pages").insert(list.map(pageToRow)));
  },
  async savePage(page) {
    check(await supabase.from("pages").update({
      title: page.title, icon: page.icon, content: page.content, updated_at: page.updatedAt
    }).eq("id", page.id).eq("user_id", page.userId));
  },
  async deletePages(ids, userId) {
    check(await supabase.from("pages").delete().in("id", ids).eq("user_id", userId));
  }
};
