const { createTerminus } = require('@godaddy/terminus');

function registerHealthCheckAndGraceful({
  server,
  cleanUp,
  healthChecks,
  beforeShutdown,
  serverStopTimeout,
  onSendFailureDuringShutdown,
}) {
  const options = {
    healthChecks: {
      ...healthChecks,
      verbatim: true,
    },
    beforeShutdown,
    timeout: serverStopTimeout,
    signals: ['SIGTERM', 'SIGINT'],
    onSignal: cleanUp,
    onSendFailureDuringShutdown,
  };

  createTerminus(server, options);
}

module.exports = { registerHealthCheckAndGraceful };
