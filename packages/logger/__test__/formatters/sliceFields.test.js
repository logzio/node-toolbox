import { sliceFields } from '../../src/formatters/sliceFields.js';

describe('formatter - sliceFields', () => {
  it('should slice field', () => {
    const logString = new Array(100000).join('1');

    const curLength = logString.length;

    const log = { body: logString };

    sliceFields(['body'])(log);

    expect(log.slicedFields.body).toEqual(curLength);
    expect(log['stringify-body'].length).toEqual(5004);
  });

  it('should slice object', () => {
    const logObject = {
      key1: new Array(100000).join('12123dasdaskodjkasasdojdoasd3'),
      key2: new Array(200000).join('12askdopkasopdkasopdkaspodkopas3123123'),
    };

    const log = { body: logObject };

    const newLog = sliceFields(['body'])(log);

    expect(newLog['overSizedField-body']).toEqual({ keysLengths: `key1 : 5799942 | key2 : 15199924`, size: 20999866 });
    expect(newLog['stringify-body'].length).toEqual(5004);
  });
});
