const errorHandler = ({ logger, extractDataFromRequest }) => {
  process.on('unhandledRejection', err => logger.error('unhandledRejection', { err }));
  process.on('uncaughtException', err => logger.error('uncaughtException', { err }));

  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const { originalMessage = 'Internal Server Error', statusCode = 500, message, logIdentifier, meta = {} } = err;

    const errorAdditionalData = extractDataFromRequest && extractDataFromRequest({ req, err });

    logger.error({
      message: message || originalMessage,
      err,
      req,
      logIdentifier,
      ...errorAdditionalData,
      ...meta,
    });

    res.status(statusCode).send({
      message,
      statusCode,
      ...meta,
      ...errorAdditionalData,
    });
  };
};

module.exports = {
  errorHandler,
};
