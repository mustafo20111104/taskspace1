// BACKEND ENTRY: connects the parts.
//   routes/auth.js   -> register, login, logout
//   routes/pages.js  -> pages: documents and boards (login required)
//   public/          -> the frontend pages (Vercel serves this folder by itself)
//
// Locally:  npm start  -> starts on http://localhost:3000
// On Vercel: the exported "app" is used, Vercel starts it.

const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);                                  // correct visitor IP behind Vercel
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));    // used locally (Vercel ignores it)

app.use("/api/auth", require("./routes/auth"));
app.use("/api/pages", require("./routes/pages"));

// Last safety net: if something crashes, answer with a clean error
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Server error. Please try again." });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("Task planner is running: http://localhost:" + PORT);
  });
}
