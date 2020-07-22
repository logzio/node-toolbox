import _ from 'lodash';

export function pickFields(name, list, shouldFlat = true) {
  return function pickFieldsLog({ [name]: property, ...data }) {
    if (!property) return data;

    const filteredList = _.pick(property, list);

    return Object.assign(data, shouldFlat ? filteredList : { [name]: filteredList });
  };
}
