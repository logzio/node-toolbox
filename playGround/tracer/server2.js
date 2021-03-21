import { Tracer } from './tracer.js';
import { nodeHttpTracer } from './nodeHttpTracer.js';
import express from 'express';
const app = express();
const port = 8283;
import asyncHandler from 'express-async-handler';
app.get(
  '/getIt',
  asyncHandler(async (req, res) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    res.send('Hello World from test 2!');
  }),
);
const server = app.listen(port, () => console.log(`Example app listening on port port!`));

const tracer = new Tracer({ debug: false, serviceName: 'server-2' });

nodeHttpTracer({
  tracer,
  server,
  onError: ({ message }) => {
    console.log('on erorr', message);
  },
});
