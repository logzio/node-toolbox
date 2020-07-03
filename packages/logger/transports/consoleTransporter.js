const { printJSON } = require('../formatters');

function createConsoleTransporter({ colorizeLog, formatters = [] }) {
  const print = printJSON({ colorizeLog });

  return function consoleTransporter({ ...data }) {
    const formatedData = formatters.reduce((transformData, formatter) => formatter(transformData), data);

    console.log(print(formatedData));
  };
}

module.exports = { createConsoleTransporter };
