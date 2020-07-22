import { sliceFields } from '../../src/formatters/sliceFields.js';

describe('formatter - sliceFields', () => {
  it('should slice field', () => {
    const logString = new Array(100000).join('1');

    const curLength = logString.length;

    const log = { body: logString };

    sliceFields(['body'])(log);
    expect(log.body.length).toEqual(5004);
    expect(log.__overSizedField__.body).toEqual(curLength);
  });

  it('should slice object', () => {
    const logObject = {
      key1: new Array(100000).join('12123dasdaskodjkasasdojdoasd3'),
      key2: new Array(200000).join('12askdopkasopdkasopdkaspodkopas3123123'),
    };

    const log = { body: { to: logObject } };

    sliceFields(['body.to'])(log);

    expect(log.__overSizedField__).toEqual({ 'body.to.key1': 5799942, 'body.to.key2': 15199924 });
  });
});
