const { get, set } = require('lodash');

function handleRequest({ requestFieldsToLog = [] }) {
  return function normalizeLog({ req, request, ...data }) {
    const anyRequest = req || request;

    if (!anyRequest) return data;

    const normalizedData = requestFieldsToLog.reduce((acc, currentValue) => {
      const fieldValue = get(anyRequest, currentValue);

      if (fieldValue) set(acc, currentValue, fieldValue);

      return acc;
    }, {});

    return Object.assign(data, { req: normalizedData });
  };
}

module.exports = { handleRequest };
