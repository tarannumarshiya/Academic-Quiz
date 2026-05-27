// ─── 404 handler ──────────────────────────────────────────────────────────────
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found – ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// ─── Global error handler ─────────────────────────────────────────────────────
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} already exists` });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};