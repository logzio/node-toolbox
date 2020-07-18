import { omitFields } from '../../src/formatters/omitFields.js';

describe('formatter - omitFields', () => {
  it('should remove fields', () => {
    const log = { omit1: '12', nested: { omit2: '12' }, name: 'boya' };

    const modifiedLog = omitFields(['omit1', 'nested.omit2'])(log);

    expect(modifiedLog).toEqual({ name: 'boya', nested: {} });
  });
});
