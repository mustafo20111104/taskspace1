const express = require("express");
const cookieParser = require("cookie-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

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
