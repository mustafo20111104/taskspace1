const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Bosh sahifa
const publicDir = path.join(__dirname, "public");

app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// HTML, CSS, JS fayllar
app.use(express.static(publicDir));

// ================================
// API ROUTES
// ================================

app.use("/api/auth", require("./routes/auth"));
app.use("/api/pages", require("./routes/pages"));

// ================================
// XATOLAR
// ================================

app.use((err, req, res, next) => {
  console.error(err);

  // TEMPORARY: return only a safe error code for an explicitly marked diagnostic request.
  if (req.get("x-taskspace-diagnostic") === "1") {
    const code = typeof err.code === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(err.code)
      ? err.code
      : "UNCLASSIFIED";
    res.setHeader("x-taskspace-diagnostic-error-code", code);
  }

  res.status(500).json({
    error: "Server error. Please try again."
  });
});

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      "Task planner is running: http://localhost:" + PORT
    );
  });
}
