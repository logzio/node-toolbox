import { default as ct } from '@godaddy/terminus';

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

  ct.createTerminus(server, options);
}
