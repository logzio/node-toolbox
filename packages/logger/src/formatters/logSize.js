import objectSize from 'rough-object-size';

const defaultSize = 1048576 * 0.5; // 1048576 * 0.5 = 0.5MB

export function logSize(maxLogSizeBytes = defaultSize) {
  return function logSizeLog(log = {}) {
    const currentSize = objectSize.roughObjectSize(log);

    if (maxLogSizeBytes <= currentSize) {
      log = {
        logObjectKeys: Object.keys(log),
        message: 'Log exceeded the max bytes size',
        maxLogSize: maxLogSizeBytes,
      };
    }

    log.logSize = currentSize;
    return log;
  };
}
