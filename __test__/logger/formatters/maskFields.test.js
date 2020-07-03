const { maskFields } = require('../../../logger/formatters');

describe('maskFields', () => {
  it('should mask filed from log if it is a string type', () => {
    const log = { body: { six: '1234567890', seven: '1234567890', password: '1234567890' } };

    maskFields({
      fieldsToMask: [{ field: 'body.six', length: 6 }, { field: 'body.seven' }, { field: 'body.password', length: 0 }],
    })(log);

    expect(log.body.six).toEqual('****567890');
    expect(log.body.seven).toEqual('***4567890');
    expect(log.body.password).toEqual('**********');
  });
});
