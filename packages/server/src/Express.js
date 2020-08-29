import _ from 'lodash';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { default as express } from 'express';
import { default as asyncHandler } from 'express-async-handler';

export class Express {
  constructor({ port = 3000, middlewares = [], routes = [], errorHandler = null } = {}) {
    this.port = port;
    this.routes = routes;
    this.errorHandler = errorHandler;
    const app = express();
    app.use(helmet());
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    middlewares.forEach(mid => {
      if (_.isArray(mid)) app.use(...mid);
      else app.use(mid);
    });

    routes.forEach(r => {
      if (r instanceof express.Router) {
        if (r.base) app.use(r.base, r);
        else app.use(r);
      } else {
        let method, path, handlers, handler;
        if (_.isArray(r)) {
          [method = 'get', path, ...handlers] = r;
        } else if (_.isObject(r)) {
          ({ method = 'get', path, handler, handlers = [] } = r);
          if (handlers && !_.isArray(handlers)) handlers = [handlers];
          if (handler) handlers = [handler, ...handlers];
        }
        app[method.toLowerCase()](path, ...handlers.map(h => (h?.constructor?.name === 'AsyncFunction' ? asyncHandler(h) : h)));
      }
    });

    if (errorHandler) app.use(errorHandler);

    this.app = app;
  }

  async stat(port = this.port) {
    return new Promise(resolve => {
      const server = this.app.listen(port, () => resolve({ app: this.app, server }));
    });
  }
}
