const { createJaegerTracer } = require('./createJaegerTracer');
const { registerTraceRoute } = require('./registerTraceRoute');
const { registerTraceToAxios } = require('./registerTraceToAxios');

module.exports = {
  registerTraceToAxios,
  registerTraceRoute,
  createJaegerTracer,
};
