const _ = require('lodash');

function omitFields({ fieldsToOmit = [] } = {}) {
  return function omitFieldsLog(log) {
    return _.omit(log, fieldsToOmit);
  };
}
module.exports = { omitFields };
