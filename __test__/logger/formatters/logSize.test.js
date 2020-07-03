const { logSize } = require('../../../logger/formatters');

describe('logSize', () => {
  it('should add log size to each log', () => {
    const log = { requestOptions: { headers: { 'X-AUTH-TOKEN': '1234567890' } } };

    logSize()(log);

    expect(log.logSize).toEqual(20);
  });
});
