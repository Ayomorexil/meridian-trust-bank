const AppError = require('../utils/AppError');

const handleJWTError = () => new AppError('Invalid session token. Please sign in again.', 401, 'SESSION_EXPIRED');
const handleJWTExpired = () => new AppError('Your session has expired. Please sign in again.', 401, 'SESSION_EXPIRED');

const sendError = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    code: err.code,
    message: err.isOperational ? err.message : 'Something went wrong. Please try again.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  let error = err;
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpired();

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  sendError(error, res);
};
