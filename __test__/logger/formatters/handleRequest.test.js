const { handleRequest } = require('../../../logger/formatters');

describe('normalize request log', () => {
  it('should filter request fields', () => {
    const requestFieldsToLog = ['fieldToBeLogged', 'nested.foo'];

    const mockedRequest = { fieldToBeLogged: 'test-field', fieldNotToShow: 'field-not-to-show', nested: { foo: 'bar' } };
    const otherData = { message: 'this is a message' };
    const data = { req: mockedRequest, otherData };
    const expected = { req: { fieldToBeLogged: 'test-field', nested: { foo: 'bar' } }, otherData };

    const normalizedData = handleRequest({ requestFieldsToLog })(data);

    expect(normalizedData).toStrictEqual(expected);
  });
});
