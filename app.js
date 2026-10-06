const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const { globalLimiter } = require("./middleware/rateLimiter");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.disable("x-powered-by");

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const allowed = [
  process.env.FRONTEND_URL,
  "https://madmadisonai.com",
  "https://www.madmadisonai.com",
  "http://localhost:3000",
].filter(Boolean);

app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        Object.assign(new Error("Origin not allowed"), {
          status: 403,
        })
      );
    },
    credentials: true,
  })
);

app.use(
  express.json({ limit: "1mb" }),
  express.urlencoded({ extended: false }),
  cookieParser(),
  morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"),
  globalLimiter
);

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    service: "MADAI API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/tasks", require("./routes/tasks"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/billing", require("./routes/billing"));
app.use("/api/founder", require("./routes/founder"));

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
  });
});

app.use(errorHandler);

module.exports = app;
