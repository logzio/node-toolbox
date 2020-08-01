'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var bodyParser = _interopDefault(require('body-parser'));
var helmet = _interopDefault(require('helmet'));
var express = _interopDefault(require('express'));
var asyncHandler = _interopDefault(require('express-async-handler'));
var ct = _interopDefault(require('@godaddy/terminus'));

class Express {
  constructor({ port = 3000, middlewares = [], routes = [], errorHandler = null } = {}) {
    this.port = port;
    this.middlewares = middlewares;
    this.routes = routes;
    this.errorHandler = errorHandler;
  }

  async start() {
    const app = express();

    app.use(helmet());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    this.middlewares.forEach(mid => {
      if (_.isArray(mid)) app.use(...mid);
      else app.use(mid);
    });

    this.routes.forEach(r => {
      if (r instanceof express.Router) app.use(r);
      else {
        let method, path, handlers, handler;
        if (_.isArray(r)) {
          [method, path, ...handlers] = r;
        } else if (_.isObject(r)) {
          ({ method, path, handler, handlers = [] } = r);
          if (handlers && !_.isArray(handlers)) handlers = [handlers];
          if (handler) handlers = [handler, ...handlers];
        }
        app[method](path, ...handlers.map(h => (h?.constructor?.name === 'AsyncFunction' ? asyncHandler(h) : h)));
      }
    });

    if (this.errorHandler) app.use(this.errorHandler);

    return new Promise(resolve => {
      const server = app.listen(this.port, () => resolve({ app, server }));
    });
  }
}

const requestHooks = ({ server, onStart, onEnd, onError } = {}) => {
  server.on('request', (req, res) => {
    const requestStartData = onStart?.(req, res);
    res.on('error', err => onError?.(err, requestStartData));
    res.on('finish', () => onEnd?.(req, res, requestStartData));
  });
};

const errorHandler = onError => {
  process.on('unhandledRejection', err => onError({ err, type: 'unhandledRejection' }));
  process.on('uncaughtException', err => onError({ err, type: 'uncaughtException' }));

  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const meta = onError?.({ req, err, type: 'route' });

    const { message = 'Internal Server Error', statusCode = 500 } = err;

    res.status(statusCode).send({
      message,
      statusCode,
      ...meta,
    });
  };
};

function healthCheckAndGraceful({ server, cleanUp, timeout, healthChecks, beforeShutdown, onSendFailureDuringShutdown }) {
  const options = {
    healthChecks: {
      ...healthChecks,
      verbatim: true,
    },
    beforeShutdown,
    timeout,
    signals: ['SIGTERM', 'SIGINT'],
    onSignal: cleanUp,
    onSendFailureDuringShutdown,
  };

  ct.createTerminus(server, options);
}

class ServerError extends Error {
  constructor({ message, statusCode = 500, status = 500, e = null, err = null, error = null, ...metaData } = {}) {
    super(message || err.message || error.message || e.message || 'GENERAL_ERROR');

    this.statusCode = statusCode || status;
    Object.assign(this, metaData);

    err = err || error || e;

    if (err) {
      this.stack = err.stack;
    } else Error.captureStackTrace(this, ServerError);
  }
}

function attachServerErrorToGlobal() {
  global.ServerError = ServerError;
}

exports.Express = Express;
exports.ServerError = ServerError;
exports.attachServerErrorToGlobal = attachServerErrorToGlobal;
exports.errorHandler = errorHandler;
exports.healthCheckAndGraceful = healthCheckAndGraceful;
exports.requestHooks = requestHooks;
