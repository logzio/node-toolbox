const { createConsoleTransporter } = require('./consoleTransporter');
const { createLogzIoTransporter } = require('./logzTransporter');

module.exports = { createConsoleTransporter, createLogzIoTransporter };
