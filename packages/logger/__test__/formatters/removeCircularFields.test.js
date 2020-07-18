import { removeCircularFields } from '../../src/formatters/removeCircularFields.js';

describe('formatter - removeCircularFields', () => {
  it('should remove circular fields', () => {
    const log = {};

    log.nestedLevel1 = {
      notCircular: {},
      circular1: log,
      nestedLevel2: {
        notCircular: {},
        circular2: log,
      },
      array: ['1', log, { circular3: log }],
    };

    const modifiedLog = removeCircularFields()(log);

    expect(modifiedLog).toEqual({
      nestedLevel1: {
        notCircular: {},
        circular1: '[Circular]',
        nestedLevel2: {
          notCircular: {},
          circular2: '[Circular]',
        },
        array: ['1', '[Circular]', { circular3: '[Circular]' }],
      },
    });
  });
});
