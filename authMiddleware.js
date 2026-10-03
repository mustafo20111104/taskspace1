// LOGIN CHECK: used by routes that only logged-in users may open.
// After login, the browser keeps a secure cookie called "token".

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("./store-supabase");

// The secret signs the login token.
//   - Online (Vercel): you MUST set JWT_SECRET in the project settings.
//   - On your computer: if JWT_SECRET is not set, a random one is created once in data/secret.txt.
function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.VERCEL) throw new Error("Set JWT_SECRET in the Vercel project settings.");
  const file = path.join(__dirname, "data", "secret.txt");
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    const secret = crypto.randomBytes(48).toString("hex");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, secret);
    return secret;
  }
}
const SECRET = getSecret();

function setLoginCookie(res, userId) {
  const token = jwt.sign({ id: userId }, SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,                                   // JavaScript in the page cannot read it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",    // https only when online
    maxAge: 7 * 24 * 60 * 60 * 1000                   // 7 days
  });
}

async function requireLogin(req, res, next) {
  let data;
  try {
    data = jwt.verify(req.cookies.token, SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Please log in" });
  }
  try {
    const user = await db.findUserById(data.id);
    if (!user) return res.status(401).json({ error: "Please log in" });
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Lets routes use async/await: any error goes to the error handler in server.js
function wrap(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { setLoginCookie, requireLogin, wrap };
