/** An error with an HTTP status the client is allowed to see. */
export class ApiError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, _res, next) {
  next(new ApiError(404, `No route for ${req.method} ${req.originalUrl}`));
}

/* eslint-disable-next-line no-unused-vars -- Express identifies this by arity */
export function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong.';
  let details = err.details;

  // Translate the storage layer's errors into something a player can read.
  if (err.name === 'ValidationError') {
    status = 422;
    message = 'That does not look right.';
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message]),
    );
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Malformed identifier.';
  } else if (err.code === 11000) {
    status = 409;
    message = 'That already exists.';
  }

  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json({
    error: {
      message,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV !== 'production' && status >= 500
        ? { stack: err.stack }
        : {}),
    },
  });
}

/** Wrap an async handler so rejections reach the error middleware. */
export const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
