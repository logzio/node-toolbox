import _ from 'lodash';

export function renameFields(fieldsToRename = {}) {
  return function renameFieldsLog({ ...data }) {
    Object.entries(fieldsToRename).forEach(([from, to]) => {
      const fieldValue = _.get(data, from);

      if (fieldValue) {
        _.set(data, to, fieldValue);
        _.unset(data, from);
      }
    });

    return data;
  };
}
