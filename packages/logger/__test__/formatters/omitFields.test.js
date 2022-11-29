import { omitFields } from '../../src/formatters/';

describe('formatter - omitFields', () => {
  it('should remove fields', () => {
    const log = {
      omit1: '12',
      nested: { omit2: '12' },
      name: 'boya',
    };

    const modifiedLog = omitFields(['omit1', 'nested.omit2'])(log);

    expect(modifiedLog).toEqual({
      nested: {},
      name: 'boya',
    });
  });

  it('should remove fields from specified log path root', () => {
    const log = {
      omit: '12',
      nested: { omit: '12', notOmit: true },
      name: 'boya',
    };

    const modifiedLog = omitFields(['omit'], ['nested'])(log);

    expect(modifiedLog).toEqual({
      nested: { notOmit: true },
      name: 'boya',
    });
  });

  it('should remove complex fields from specified log path root', () => {
    const log = {
      omitContainer: { omit: '12' },
      nested: {
        omitContainer: { omit: '12', notOmit: true },
      },
      name: 'boya',
    };

    const modifiedLog = omitFields(['omitContainer.omit'], ['nested'])(log);

    expect(modifiedLog).toEqual({
      omitContainer: {},
      nested: {
        omitContainer: { notOmit: true },
      },
      name: 'boya',
    });
  });
});
