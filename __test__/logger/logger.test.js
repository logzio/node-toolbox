const { createLogger } = require('../../logger');

describe('logz.io pre config logger', () => {
  it('should not create logger without serviceName', () => {
    try {
      createLogger();
    } catch (err) {
      expect(err.message).toEqual('please provide logger serviceName');
    }
  });
});
