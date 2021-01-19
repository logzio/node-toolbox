import _ from 'lodash';
import se from 'serialize-error';

export function handleError() {
  return function handleErrorLog({ err = null, error = null, logLevel, message = null, ...data }) {
    let serError;

    if (err) serError = err;
    else if (error) serError = error;
    else if (_.isObject(message)) {
      const { err: messageErr, error: messageError, ...restMessage } = message;
      if (messageErr) {
        serError = messageErr;
      } else if (messageError) {
        serError = messageError;
      } else {
        return { logLevel, message, ...data };
      }
      message = restMessage;
    } else {
      return { logLevel, message, ...data };
    }

    if (message) data.message = message;

    const { name, stack, message: errorMessage } = serError;

    return {
      ...data,
      logLevel: 'ERROR',
      error: se.serializeError({ name, stack, message: errorMessage }),
    };
  };
}
