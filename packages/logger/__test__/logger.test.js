import { Logger } from '../src/logger';
import { Transport } from '../src/transports/Transport.js';
describe('Logger', () => {
  it('warn when start without transport', () => {
    let checked = false;
    console.warn = data => {
      expect(data).toEqual('LOGGER: HAVE NO TRANSPORTS');
      checked = true;
    };
    new Logger();
    expect(checked).toEqual(true);
  });

  it('add and remove formatters', () => {
    let formatCalls = [];
    const format1 = data => {
      expect(data.message).toEqual('first');
      data.message = 'format1';
      formatCalls.push('format1');
      return data;
    };
    const format2 = data => {
      expect(data.message).toEqual('format1');
      data.message = 'format2';
      formatCalls.push('format2');
      return data;
    };

    const format3 = data => {
      expect(data.message).toEqual('format2');
      data.message = 'format3';
      formatCalls.push('format3');
      return data;
    };

    const format4 = data => {
      expect(data.message).toEqual('format3');
      data.message = 'format4';
      formatCalls.push('format4');
      return data;
    };

    class CustomTrasport extends Transport {
      log() {
        return 1;
      }
    }

    const trasport = new CustomTrasport({ name: 'stam' });

    const logger = new Logger({ formatters: [format1, format2], transports: [trasport] });

    logger.log({ message: 'first' });
    expect(formatCalls).toEqual(['format1', 'format2']);
    formatCalls = [];
    logger.addFormatter(format3);
    logger.log({ message: 'first' });
    expect(formatCalls).toEqual(['format1', 'format2', 'format3']);
    formatCalls = [];
    logger.removeFormatter(format3);
    logger.log({ message: 'first' });
    expect(formatCalls).toEqual(['format1', 'format2']);
    formatCalls = [];
    logger.addFormatter([format3, format4]);
    logger.log({ message: 'first' });
    expect(formatCalls).toEqual(['format1', 'format2', 'format3', 'format4']);
  });

  it('add and remove trasports', () => {
    const format1 = data => {
      expect(data.message).toEqual('first');
      data.message = 'format1';
      return data;
    };

    const format2 = data => {
      expect(data.message).toEqual('format1');
      data.message = 'format2';
      return data;
    };

    let custom1FinalMessage = '';
    let custom1Called = false;
    class CustomTrasport extends Transport {
      log(data) {
        expect(data.message).toEqual(custom1FinalMessage);
        custom1Called = true;
      }
    }

    let custom2FinalMessage = '';
    let custom2Called = false;
    class CustomTrasport2 extends Transport {
      log(data) {
        expect(data.message).toEqual(custom2FinalMessage);
        custom2Called = true;
      }
    }

    let transport1 = new CustomTrasport({ name: 't1' });
    let transport2 = new CustomTrasport2({ name: 't2' });

    const logger = new Logger({ transports: transport1 });

    custom1FinalMessage = 'first';
    logger.log({ message: 'first' });
    expect(custom1Called).toEqual(true);
    expect(custom2Called).toEqual(false);
    custom1Called = false;

    logger.addFormatter(format1);
    custom1FinalMessage = 'format1';
    logger.log({ message: 'first' });
    expect(custom1Called).toEqual(true);
    expect(custom2Called).toEqual(false);
    custom1Called = false;

    logger.addTransport(transport2);
    custom1FinalMessage = 'format1';
    custom2FinalMessage = 'format1';
    logger.log({ message: 'first' });
    expect(custom1Called).toEqual(true);
    expect(custom2Called).toEqual(true);
    custom1Called = false;
    custom2Called = false;

    transport1.addFormatter(format2);
    custom1FinalMessage = 'format2';
    custom2FinalMessage = 'format1';
    logger.log({ message: 'first' });
    expect(custom1Called).toEqual(true);
    expect(custom2Called).toEqual(true);
    custom1Called = false;
    custom2Called = false;

    transport1.removeFormatter(format2);
    custom1FinalMessage = 'format1';
    custom2FinalMessage = 'format1';
    logger.log({ message: 'first' });
    expect(custom1Called).toEqual(true);
    expect(custom2Called).toEqual(true);
    custom1Called = false;
    custom2Called = false;

    logger.removeTransport('t2');
    custom1FinalMessage = 'format1';
    logger.log({ message: 'first' });
    expect(custom1Called).toEqual(true);
    expect(custom2Called).toEqual(false);
    custom1Called = false;
  });
});
