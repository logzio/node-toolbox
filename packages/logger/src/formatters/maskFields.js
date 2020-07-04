import _ from 'lodash';
export function maskFields(list = [], defaultLengthToMask = 7) {
  return function maskFieldsLog(log) {
    list.forEach(({ field, length = null }) => {
      const fieldValue = _.get(log, field);

      if (!fieldValue) return;

      if (typeof fieldValue !== 'string') return;

      if (length === 0) _.set(log, field, '*'.repeat(fieldValue.length));
      else {
        const useLength = length || defaultLengthToMask;

        if (useLength > fieldValue.length) return;

        const from = fieldValue.length - useLength;

        _.set(log, field, '*'.repeat(from) + fieldValue.substring(from, fieldValue.length));
      }
    });

    return log;
  };
}
