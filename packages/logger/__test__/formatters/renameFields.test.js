import { renameFields } from '../../src/formatters/renameFields';

describe('formatter - renameFields', () => {
  it('should rename fields', () => {
    const fieldsToRename = {
      'req.headers.x-request-id': 'requestId',
      'user-agent': 'header-user-agent',
      'nested.foo': 'nested.foobar',
    };

    const logData = {
      message: 'test message',
      req: { headers: { 'x-request-id': 'test-request-id' } },
      nested: { foo: 'bar' },
    };

    const expected = {
      message: 'test message',
      req: { headers: {} },
      requestId: 'test-request-id',
      nested: { foobar: 'bar' },
    };

    const newData = renameFields(fieldsToRename)(logData);

    expect(newData).toStrictEqual(expected);
  });
});
