import { Transport } from '../../src/transports/Transport.js';
import { Logger } from '../../src/Logger';

describe('transports - Transport - create default transport', () => {
  it('should remove fields', () => {
    const f = () => {
      return log => {
        log.add = 1;
        return log;
      };
    };

    const t = new Transport({ name: 'custom', formatters: [f()] });
    t.log = jest.fn();

    const logger = new Logger({ transports: [t] });
    logger.info('hello');
    logger.debug('hello');

    expect(t.log).toBeCalledWith(
      expect.objectContaining({
        message: 'hello',
        add: 1,
        logLevel: 'INFO',
        timestamp: expect.any(String),
      }),
    );

    t.logLevel = 'DEBUG';

    logger.debug('hello');
    expect(t.log).toBeCalledTimes(2);
  });
});
