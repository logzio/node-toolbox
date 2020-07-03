const { logSize } = require('./logSize');
const { maskFields } = require('./maskFields');
const { omitFields } = require('./omitFields');
const { sliceFields } = require('./sliceFields');
const { renameFields } = require('./renameFields');
const { printJSON } = require('./printJSON');
const { removeCircularFields } = require('./removeCircularFields');
const { handleRequest } = require('./handleRequest');
const { handleError } = require('./handleError');

module.exports = {
  logSize,
  printJSON,
  maskFields,
  omitFields,
  sliceFields,
  renameFields,
  handleError,
  removeCircularFields,
  handleRequest,
};
