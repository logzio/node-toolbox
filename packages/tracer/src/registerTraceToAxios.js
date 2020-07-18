// const axios = require('axios');

// function registerTraceToAxios({ tracer, shouldExcludeUrl = null, onCreateSpan = null, logger = console } = {}) {
//   if (!axios) return;

//   if (!tracer) throw new Error('must provide tracer');

//   axios.interceptors.request.use(
//     function (config) {
//       try {
//         if (!shouldExcludeUrl || !shouldExcludeUrl(config.url)) {
//           const span = tracer.createSpan({
//             url: config.url,
//             method: config.method,
//             headers: config.headers,
//             tags: config.meta && config.meta.tags,
//           });

//           if (onCreateSpan) onCreateSpan({ req: config.request || config, span });

//           if (!config.meta) config.meta = {};

//           config.meta.span = span;
//         }
//       } catch (err) {
//         logger.error({ message: `failed to create span ${err.message}`, error: err });
//       }

//       return config;
//     },
//     function (error) {
//       try {
//         if (error.config && error.config.meta && error.config.meta.span) {
//           const { span, ...meta } = error.config.meta;

//           const err = error.error || error.message || 'request error';

//           tracer.finishSpan({ span, status: 500, error: err });
//           error.config.meta = meta;
//         }
//       } catch (err) {
//         logger.error({ message: `failed to finish span ${err.message}`, error: err });
//       }

//       return Promise.reject(error);
//     },
//   );

//   axios.interceptors.response.use(
//     function (response) {
//       try {
//         if (response.config && response.config.meta && response.config.meta.span) {
//           const { span, ...meta } = response.config.meta;

//           tracer.finishSpan({ span, status: response.status });
//           response.config.meta = meta;
//         }
//       } catch (err) {
//         logger.error({ message: `failed to finish span ${err.message}`, error: err });
//       }

//       return response;
//     },
//     function (error) {
//       try {
//         if (error.config && error.config.meta && error.config.meta.span) {
//           const { span, ...meta } = error.config.meta;
//           const err = error.error || error.message || 'request error';

//           const status = error.response && error.response.status;

//           tracer.finishSpan({ span, status, error: err });
//           error.config.meta = meta;
//         }
//       } catch (err) {
//         logger.error({ message: `failed to finish span ${err.message}`, error: err });
//       }

//       return Promise.reject(error);
//     },
//   );
// }

// module.exports = { registerTraceToAxios };
