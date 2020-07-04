import _ from 'lodash';

export function omitFields(fieldsToOmit = []) {
  return function omitFieldsLog(log) {
    return _.omit(log, fieldsToOmit);
  };
}
