// GAME RULES: points (XP), levels and daily streaks.
//   - The first time you finish an item (a to-do or a card in a Done column): +10 XP
//   - Finishing the same item again gives no new XP, so ticking it on and off does not farm points
//   - You can earn at most 200 XP per day
//   - Every 100 XP = 1 level
//   - Finishing at least one new item per day keeps your streak going

const XP_PER_ITEM = 10;
const DAILY_CAP = 200;

function levelOf(xp) {
  return Math.floor(xp / 100) + 1;
}

function statsOf(user) {
  const xp = user.xp || 0;
  return { xp, level: levelOf(xp), streak: user.streak || 0, lastDoneDate: user.lastDoneDate || null };
}

// The browser sends its local date. We accept it only if it is close to the real date.
function safeToday(today) {
  const text = String(today || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text) && Math.abs(Date.parse(text + "T00:00:00Z") - Date.now()) < 2 * 86400000) {
    return text;
  }
  return new Date().toISOString().slice(0, 10);
}

function dayBefore(text) {
  const [y, m, d] = text.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

// "count" = how many items were finished for the first time in this save.
// Returns how much XP was given and whether the daily limit cut it short.
function reward(user, count, today) {
  if (count <= 0) return { gained: 0, capped: false };
  const day = safeToday(today);

  if (user.xpDate !== day) {            // a new day: reset today's counter
    user.xpDate = day;
    user.xpToday = 0;
  }
  const wanted = count * XP_PER_ITEM;
  const gained = Math.min(wanted, Math.max(0, DAILY_CAP - (user.xpToday || 0)));
  user.xp = (user.xp || 0) + gained;
  user.xpToday = (user.xpToday || 0) + gained;

  if (user.lastDoneDate !== day) {      // streak: one finished item per day is enough
    user.streak = user.lastDoneDate === dayBefore(day) ? (user.streak || 0) + 1 : 1;
    user.lastDoneDate = day;
  }
  return { gained, capped: gained < wanted };
}

module.exports = { XP_PER_ITEM, statsOf, reward };
