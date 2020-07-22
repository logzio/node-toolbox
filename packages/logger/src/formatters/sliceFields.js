import objectSize from 'rough-object-size';
import { removeCircularFields } from './removeCircularFields.js';
import _ from 'lodash';

const rmCircular = removeCircularFields();
export function sliceFields(fieldsToSlice = [], maxFieldByteSize = 10000) {
  const maxFieldLength = maxFieldByteSize / 2;

  return function sliceFieldsLog(log) {
    fieldsToSlice.forEach(fieldToSlice => {
      const candidate = _.get(log, fieldToSlice);

      if (typeof candidate === 'string' && candidate.length > maxFieldLength) {
        _.unset(log, fieldToSlice);
        _.set(log, fieldToSlice, `${candidate.slice(0, maxFieldLength)} ...`);
        if (!log.__overSizedField__) log.__overSizedField__ = {};
        log.__overSizedField__[fieldToSlice] = candidate.length;
      } else if (typeof candidate === 'object' && objectSize.roughObjectSize(rmCircular(candidate)) > maxFieldLength) {
        if (!log.__overSizedField__) log.__overSizedField__ = {};
        Object.keys(candidate).reduce((acc, key) => {
          const fullKey = `${fieldToSlice}.${key}`;
          log.__overSizedField__[fullKey] = objectSize.roughObjectSize(_.get(log, fullKey));
          return acc;
        }, {});
        _.unset(log, fieldToSlice);
        _.set(log, fieldToSlice, `${JSON.stringify(candidate).slice(0, maxFieldLength)} ...`);
      }
    });

    return log;
  };
}
