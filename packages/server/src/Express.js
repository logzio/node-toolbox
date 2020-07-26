import _ from 'lodash';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { default as asyncHandler } from 'express-async-handler';

export class Express {
  constructor({ port = 3000, middlewares = [], routes = [], beforeAll = null, afterAll = null, errorHandler = null } = {}) {
    this.port = port;
    this.middlewares = middlewares;
    this.routes = routes;
    this.beforeAll = beforeAll;
    this.afterAll = afterAll;
    this.errorHandler = errorHandler;
  }

  async start() {
    if (this.beforeAll) app.use(this.beforeAll);
    let { default: express } = await import('express');
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
          if (handler) handlers.push(handler);
          if (handlers && !_.isArray(handlers)) handlers.push(...handlers);
        }
        app[method](path, ...handlers.map(h => (h?.constructor?.name === 'AsyncFunction' ? asyncHandler(h) : h)));
      }
    });

    if (this.errorHandler) app.use(this.errorHandler);

    if (this.afterAll) this.afterAll(app);

    return new Promise(resolve => {
      const server = app.listen(this.port, () => resolve({ app, server }));
    });
  }
}
