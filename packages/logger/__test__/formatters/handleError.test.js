import { handleError } from '../../src/formatters/handleError';
import { serializeError } from 'serialize-error';
describe('formatter - handleError', () => {
  it('should serialized error but keep all the other fields', () => {
    const err = new Error('error message');
    const log = { err, message: 'yablolbo' };
    const expected = { error: serializeError(err), message: 'yablolbo', logLevel: 'ERROR' };

    const newLog = handleError()(log);

    expect(newLog).toEqual(expected);
  });
});
