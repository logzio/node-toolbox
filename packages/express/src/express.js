import _ from 'lodash';
import bodyParser from 'body-parser';
import helmet from 'helmet';

export async function createExpress({ port = 3000, middlewares = [], routes = [], beforeAll = null, onError = null } = {}) {
  let { default: express } = await import('express');
  const app = express();

  if (beforeAll) app.use(beforeAll);

  app.use(helmet());
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  middlewares.forEach(mid => {
    if (_.isArray(mid)) app.use(...mid);
    else app.use(mid);
  });

  app.get('/test3', (req, res) => {
    res.send('ok');
  });

  routes.forEach(r => {
    if (_.isArray(r)) {
      const [method, path, ...handlers] = r;
      app[method](path, ...handlers);
    } else if (_.isObject(r)) {
      let { method, path, handlers } = r;
      if (!_.isArray(handlers)) handlers = [handlers];
      app[method](path, ...handlers);
    } else if (r instanceof express.Router) app.use(r);
  });

  app.use(onError);

  return new Promise(resolve => {
    const server = app.listen(port, () => resolve({ app, server }));
  });
}
