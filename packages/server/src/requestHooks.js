export const requestHooks = ({ server, onRequestStart, onRequestEnd, onRequestError }) => {
  server.on('request', (req, res) => {
    const requestStartData = onRequestStart?.({ req, res });
    res.on('error', err => onRequestError?.({ err, requestStartData }));
    res.on('finish', () => onRequestEnd?.({ req, res, requestStartData }));
  });
};
