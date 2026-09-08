/**
 * notFound
 * Catches any request that didn't match a route and forwards a 404 error.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found — ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  return next(error);
};

/**
 * errorHandler
 * Centralized Express error-handling middleware.
 * Returns a consistent JSON shape: { success, message, [stack] }.
 * The stack trace is only included in development mode.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  // Expose stack trace only in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    response.message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return res.status(400).json(response);
  }

  // Handle Mongoose duplicate-key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    response.message = `Duplicate value: ${field} already exists.`;
    return res.status(409).json(response);
  }

  // Handle Mongoose cast errors (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    response.message = `Invalid value for ${err.path}: ${err.value}`;
    return res.status(400).json(response);
  }

  return res.status(statusCode).json(response);
};

module.exports = { notFound, errorHandler };
