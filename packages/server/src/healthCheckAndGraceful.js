import { createTerminus } from '@godaddy/terminus';

export function healthCheckAndGraceful({ server, cleanUp, timeout, healthChecks, beforeShutdown, onSendFailureDuringShutdown }) {
  const options = {
    healthChecks: {
      ...healthChecks,
      verbatim: true,
    },
    beforeShutdown,
    timeout,
    signals: ['SIGTERM', 'SIGINT'],
    onSignal: cleanUp,
    onSendFailureDuringShutdown,
  };

  createTerminus(server, options);
}
