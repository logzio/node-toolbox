const { roughObjectSize } = require('rough-object-size');

// 1048576 * 0.5 = 0.5MB
function logSize({ maxLogSizeBytes = 1048576 * 0.5 } = {}) {
  return function logSizeLog(log) {
    log.logSize = roughObjectSize(log);

    if (maxLogSizeBytes < log.logSize) {
      log.logObjectKeys = Object.keys(log);
      log.message = 'Log exceeded the max bytes size';
      log.maxLogSize = maxLogSizeBytes;
    }

    return log;
  };
}
module.exports = { logSize };
