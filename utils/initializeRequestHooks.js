const initializeRequestHooks = ({ server, onRequestStart, onRequestEnd }) => {
  server.on('request', (req, res) => {
    const requestStartData = onRequestStart({ req, res });

    res.on('finish', () => {
      onRequestEnd({ req, res, requestStartData });
    });
  });
};

module.exports = { initializeRequestHooks };
