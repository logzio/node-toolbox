import _ from 'lodash';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import { default as express } from 'express';
import { default as asyncHandler } from 'express-async-handler';

export class Express {
  constructor({ port = 3000, middlewares = [], routes = [], errorHandler = null } = {}) {
    this.port = port;
    this.app = express();
    this.app.use(helmet());
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());

    middlewares.forEach(mid => {
      if (_.isArray(mid)) this.app.use(...mid);
      else this.app.use(mid);
    });

    routes.forEach(r => {
      if (r instanceof express.Router) {
        if (r.base) this.app.use(r.base, r);
        else this.app.use(r);
      } else {
        let method, path, handlers, handler;
        if (_.isArray(r)) {
          [method = 'get', path, ...handlers] = r;
        } else if (_.isObject(r)) {
          ({ method = 'get', path, handler, handlers = [] } = r);
          if (handlers && !_.isArray(handlers)) handlers = [handlers];
          if (handler) handlers = [handler, ...handlers];
        }
        this.app[method.toLowerCase()](
          path,
          ...handlers.map(h => (h?.constructor?.name === 'AsyncFunction' ? asyncHandler(h) : h)),
        );
      }
    });

    if (errorHandler) this.app.use(errorHandler);
  }

  async start(port = this.port) {
    return new Promise(resolve => {
      const server = this.app.listen(port, () => resolve({ app: this.app, server }));
    });
  }
}
