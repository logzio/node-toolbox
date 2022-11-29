import _ from 'lodash';

export function omitFields(fieldsToOmit = [], omitFieldsPathRoots = []) {
  return function omitFieldsLog(log) {
    const result = _.omit(log, fieldsToOmit);
    return omitFieldsPathRoots.reduce(
      (acc, pathRoot) => (acc[pathRoot] ? { ...acc, [pathRoot]: _.omit(acc[pathRoot], fieldsToOmit) } : acc),
      result,
    );
  };
}
