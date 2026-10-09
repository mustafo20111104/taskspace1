const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// TEMPORARY: expose only the runtime Supabase URL pathname while log access is unavailable.
app.get("/api/diagnostics/supabase-url-path", (req, res) => {
  let pathname = "/";
  try {
    pathname = new URL(process.env.SUPABASE_URL).pathname || "/";
  } catch {
    pathname = "UNPARSEABLE";
  }
  res.type("text/plain").send(pathname);
});

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
