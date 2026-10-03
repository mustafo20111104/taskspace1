const express = require("express");
const bcrypt = require("bcryptjs");

const db = require("../store-supabase");
const { setLoginCookie, requireLogin, wrap } = require("../authMiddleware");
const game = require("../game");

const router = express.Router();


// POST /api/auth/register
router.post("/register", wrap(async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name) {
    return res.status(400).json({ error: "Please enter your name." });
  }

  if (!email) {
    return res.status(400).json({ error: "Please enter your email." });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters."
    });
  }

  const existing = await db.findUserByEmail(email);

  if (existing) {
    return res.status(400).json({
      error: "An account with this email already exists."
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.createUser({
    name,
    email,
    passwordHash
  });

  setLoginCookie(res, user.id);

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    stats: game.statsOf(user)
  });
}));


// POST /api/auth/login
router.post("/login", wrap(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!email || !password) {
    return res.status(400).json({
      error: "Please enter your email and password."
    });
  }

  const user = await db.findUserByEmail(email);

  if (!user) {
    return res.status(401).json({
      error: "Invalid email or password."
    });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({
      error: "Invalid email or password."
    });
  }

  setLoginCookie(res, user.id);

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    stats: game.statsOf(user)
  });
}));


// GET /api/auth/me
router.get("/me", requireLogin, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    stats: game.statsOf(req.user)
  });
});


// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  res.status(204).end();
});


module.exports = router;
