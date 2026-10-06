require("dotenv").config();

const http = require("http");
const app = require("./app");

const PORT = process.env.PORT || 10000;

const server = http.createServer(app);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MADAI backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

server.on("error", (error) => {
  console.error("MADAI server error:", error);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down MADAI server...");

  server.close(() => {
    console.log("MADAI server stopped.");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received. Shutting down MADAI server...");

  server.close(() => {
    console.log("MADAI server stopped.");
    process.exit(0);
  });
});
