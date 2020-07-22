import { pickFields } from '../../src/formatters/pickFields.js';

describe('formatter - pickFields', () => {
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

    const normalizedData = pickFields('req', whiteList)(mockedLog);

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

    const normalizedData = pickFields('req', whiteList, false)(mockedLog);

    expect(normalizedData).toStrictEqual(expected);
  });
});
