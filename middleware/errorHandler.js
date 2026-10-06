function errorHandler(err, req, res, next) {
  console.error("MADAI API Error:", err);

  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;

  const response = {
    error:
      status === 500
        ? "Internal server error"
        : err.message || "Request failed",
  };

  if (process.env.NODE_ENV !== "production" && err.stack) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
}

module.exports = errorHandler;
