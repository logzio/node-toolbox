const _ = require('lodash');

const { serializeError } = require('serialize-error');

function handleError({ err = null, error = null, logLevel, message = null, ...data }) {
  let serError;

  if (err) serError = err;
  else if (error) serError = error;
  else if (_.isObject(message) && message.err && _.isObject(message.err)) {
    serError = message.err;
  } else {
    return { logLevel, message, ...data };
  }

  const { name, stack, message: errorMessage } = serError;
  const serialized = serializeError({ name, stack, message: errorMessage });

  return {
    ...data,
    logLevel: 'ERROR',
    ...serialized,
  };
}
module.exports = { handleError };
