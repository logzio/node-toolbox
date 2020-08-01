import _ from 'lodash';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { default as express } from 'express';
import { default as asyncHandler } from 'express-async-handler';

export class Express {
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
