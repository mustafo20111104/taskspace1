const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const db = require("../db");
const { setLoginCookie, requireLogin, wrap } = require("../authMiddleware");
const game = require("../game");
const templates = require("../templates");

const router = express.Router();

router.post("/register", wrap(async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!name || name.length > 50) {
    return res.status(400).json({
      error: "Please enter your name (max 50 letters)."
    });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({
      error: "Please enter a valid email."
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "Password must be at least 8 characters."
    });
  }

  const existing = await db.findUserByEmail(email);

  if (existing) {
    return res.status(409).json({
      error: "An account with this email already exists."
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let user;
  try {
    user = await db.createUser({
      id: crypto.randomUUID(),
      name,
      email,
      passwordHash,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    // The email uniqueness check above can race another registration request.
    if (error.code === "23505") {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    throw error;
  }

  try {
    await db.createPages(templates.starterPages(user.id));
  } catch (error) {
    // Do not leave behind an account that could not finish initialization.
    try {
      await db.deleteUser(user.id);
    } catch (cleanupError) {
      console.error("Could not roll back incomplete registration.");
    }
    throw error;
  }

  setLoginCookie(res, user.id);

  res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    stats: game.statsOf(user)
  });
}));

router.post("/login", wrap(async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

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

router.get("/me", requireLogin, (req, res) => {
  res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    stats: game.statsOf(req.user)
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });

  res.status(204).end();
});

module.exports = router;
