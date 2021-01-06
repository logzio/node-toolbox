import { handleError } from '../../src/formatters/handleError.js';
import { serializeError } from 'serialize-error';
describe('formatter - handleError', () => {
  it('should serialized error but keep all the other fields', () => {
    const err = new Error('error message');
    const log = { err, message: 'yablolbo' };
    const expected = { error: serializeError(err), message: 'yablolbo', logLevel: 'ERROR' };

    const newLog = handleError()(log);

    expect(newLog).toEqual(expected);
  });

  it('should serialized error in message field', () => {
    const err = new Error('error message');
    const log = { message: { err, moreData: 'wow' } };
    const expected = { error: serializeError(err), message: { moreData: 'wow' }, logLevel: 'ERROR' };

    const newLog = handleError()(log);

    expect(newLog).toEqual(expected);
  });
});
