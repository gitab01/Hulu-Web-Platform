'use strict';

const ApiError = require('../utils/ApiError');

/** Wrap async route handlers so rejected promises reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function notFound(_req, _res, next) {
  next(new ApiError(404, 'Route not found', 'not_found'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  let status = err.status || 500;
  let code = err.code || 'internal_error';
  let message = err.message || 'Unexpected error';

  if (err.name === 'ValidationError') {
    status = 400;
    code = 'validation_error';
    message = Object.values(err.errors).map((e) => e.message).join('; ');
  } else if (err.code === 11000) {
    status = 409;
    code = 'duplicate';
    message = 'Resource already exists';
  } else if (err.name === 'CastError') {
    status = 400;
    code = 'bad_id';
    message = 'Malformed identifier';
  }

  if (status >= 500) {
    // Don't leak internals on unexpected failures.
    console.error('[error]', err);
    if (process.env.NODE_ENV !== 'test') {
      message = 'Unexpected error';
    }
  }

  res.status(status).json({ error: { code, message } });
}

module.exports = { asyncHandler, notFound, errorHandler };
