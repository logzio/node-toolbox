export const errorHandler = onError => {
  process.on('unhandledRejection', err => onError({ err, type: 'unhandledRejection' }));
  process.on('uncaughtException', err => onError({ err, type: 'uncaughtException' }));

  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const meta = onError?.({ req, err, type: 'route' });

    const { message = 'Internal Server Error', statusCode = 500 } = err;

    res.status(statusCode).send({
      message,
      statusCode,
      ...meta,
    });
  };
};
