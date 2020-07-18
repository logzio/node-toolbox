import { logSize } from '../../src/formatters/logSize.js';

describe('formatter - logSize', () => {
  it('should add log size to each log', () => {
    const logSizeFormat = logSize();

    const logSize0 = {};

    expect(logSizeFormat(logSize0).logSize).toEqual(0);

    const logSize20 = { requestOptions: { headers: { 'X-AUTH-TOKEN': '1234567890' } } };

    expect(logSizeFormat(logSize20).logSize).toEqual(20);
  });

  it('should remove log if is to big', () => {
    const logSizeFormat = logSize(50);

    const bigLog = {
      field1: '123',
      field2: '123',
      field3: '123',
      field4: '123',
      field5: '123',
      field6: '123',
      field7: '123',
      filed8: {
        name: 'simona',
      },
    };

    const expected = {
      logSize: 54,
      message: 'Log exceeded the max bytes size',
      maxLogSize: 50,
      logObjectKeys: Object.keys(bigLog),
    };

    const newLog = logSizeFormat(bigLog);

    expect(newLog).toEqual(expected);
  });
});
