export const requestHooks = ({ server, onStart, onEnd, onError } = {}) => {
  server.on('request', (req, res) => {
    const requestStartData = onStart?.(req, res);
    res.on('error', err => onError?.(err, requestStartData));
    res.on('finish', () => onEnd?.(req, res, requestStartData));
  });
};
