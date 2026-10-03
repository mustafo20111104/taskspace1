const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

// Bosh sahifa
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// HTML, CSS, JS fayllar
app.use(express.static(__dirname));

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
