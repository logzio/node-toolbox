export class ServerError extends Error {
  constructor({ message, statusCode = 500, status = 500, e = null, err = null, error = null, ...metaData } = {}) {
    super(message || err.message || error.message || e.message || 'GENERAL_ERROR');

    this.statusCode = statusCode || status;
    Object.assign(this, metaData);

    err = err || error || e;

    if (err) {
      this.stack = err.stack;
    } else Error.captureStackTrace(this, ServerError);
  }
}

export function attachServerErrorToGlobal() {
  global.ServerError = ServerError;
}
