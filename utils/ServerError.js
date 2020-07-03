global.ServerError = class ServerError extends Error {
  constructor({ message, statusCode = 500, err = null, logIdentifier, meta }) {
    super(message || err.message);
    this.statusCode = statusCode || status;
    this.meta = meta;
    this.logIdentifier = logIdentifier;

    if (err) {
      if (err.originalMessage) {
        this.originalMessage = err.originalMessage;
      } else {
        this.originalMessage = err.message;
      }

      this.stack = err.stack;
    } else Error.captureStackTrace(this, ServerError);
  }
};
