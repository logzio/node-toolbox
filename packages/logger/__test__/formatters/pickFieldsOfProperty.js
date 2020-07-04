import { pickFieldsOfProperty } from '../../src/formatters/pickFieldsOfProperty';

describe('formatter - pickFieldsOfProperty', () => {
  it('should filter request fields and flatten to log', () => {
    const whiteList = ['fieldToBeLogged', 'nested.foo'];

    const mockedLog = {
      req: {
        fieldToBeLogged: 'test-field',
        fieldNotToShow: 'field-not-to-show',
        nested: { foo: 'bar', zoo: 'coo' },
      },
      message: 'this is a message',
    };

    const expected = {
      fieldToBeLogged: 'test-field',
      nested: { foo: 'bar' },
      message: 'this is a message',
    };

    const normalizedData = pickFieldsOfProperty('req', whiteList)(mockedLog);

    expect(normalizedData).toStrictEqual(expected);
  });

  it('should filter request fields and set whitelist under req property', () => {
    const whiteList = ['fieldToBeLogged', 'nested.foo'];

    const mockedLog = {
      req: {
        fieldToBeLogged: 'test-field',
        fieldNotToShow: 'field-not-to-show',
        nested: { foo: 'bar', zoo: 'coo' },
      },
      message: 'this is a message',
    };

    const expected = {
      req: {
        fieldToBeLogged: 'test-field',
        nested: { foo: 'bar' },
      },
      message: 'this is a message',
    };

    const normalizedData = pickFieldsOfProperty('req', whiteList, false)(mockedLog);

    expect(normalizedData).toStrictEqual(expected);
  });
});
