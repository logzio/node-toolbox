import objectSize from 'rough-object-size';
import { removeCircularFields } from './removeCircularFields.js';
import _ from 'lodash';

export function sliceFields(fieldsToSlice = [], maxFieldByteSize = 10000) {
  const maxFieldLength = maxFieldByteSize / 2;

  function sliceObject(log, obj, key) {
    const size = objectSize.roughObjectSize(obj);

    if (size >= maxFieldByteSize) {
      const keysLengths = Object.entries(obj)
        .map(([subKey, value]) => `${subKey} : ${objectSize.roughObjectSize(value)}`)
        .join(' | ');

      _.set(log, `overSizedField-${key}.keysLengths`, keysLengths);
      _.set(log, `overSizedField-${key}.size`, size);
      sliceStringField(log, JSON.stringify(removeCircularFields(obj)), key);
    }
  }

  function addToSlicedObject(log, fieldPath, fieldLength) {
    if (!log.slicedFields) log.slicedFields = {};

    log.slicedFields[fieldPath] = fieldLength;
  }

  function sliceStringField(log, value, fieldToSlice) {
    if (typeof value === 'string' && value.length > maxFieldLength) {
      _.set(log, `stringify-${fieldToSlice}`, `${value.slice(0, maxFieldLength)} ...`);
      addToSlicedObject(log, fieldToSlice, value.length);
    }
  }

  return function sliceFieldsLog(log) {
    fieldsToSlice.forEach(filedToSlice => {
      const value = _.get(log, filedToSlice);

      if (!value) return;

      if (typeof value === 'string') sliceStringField(log, value, filedToSlice);
      else if (typeof value === 'object') sliceObject(log, value, filedToSlice);
    });

    return log;
  };
}
