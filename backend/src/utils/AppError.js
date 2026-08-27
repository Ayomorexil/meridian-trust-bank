class AppError extends Error {
  constructor(message, statusCode, code = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code; // machine-readable banking error code, e.g. 'INSUFFICIENT_FUNDS'
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
