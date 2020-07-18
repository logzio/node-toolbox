import _ from 'lodash';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import http from 'http';
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
      if (_.isArray(r)) {
        const [method, path, ...handlers] = r;
        app[method](path, ...handlers);
      } else if (_.isObject(r)) {
        let { method, path, handlers } = r;
        if (!_.isArray(handlers)) handlers = [handlers];
        app[method](path, ...handlers);
      } else if (r instanceof express.Router) app.use(r);
    });

    app.use(this.errorHandler);
    const server = http.createServer(app);

    if (this.afterAll) this.afterAll({ app, server });

    return new Promise(resolve => {
      app.listen(this.port, () => resolve({ app, server }));
    });
  }
}
