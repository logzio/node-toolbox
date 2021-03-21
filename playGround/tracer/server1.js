import { Tracer } from '../../packages/tracer/src/tracer.js';
import { middlewareTracer } from '../../packages/tracer/src/middlewareTracer.js';
import { nodeHttpTracer } from '../../packages/tracer/src/nodeHttpTracer.js';
import { axiosHooksTracer } from '../../packages/tracer/src/axiosHooksTracer.js';
import express from 'express';
const app = express();
const port = 8282;

import asyncHandler from 'express-async-handler';
import axios from 'axios';

const tracer = new Tracer({ debug: true, serviceName: 'server-1' });

app.use(middlewareTracer({ tracer }));
app.get(
  '/get',
  asyncHandler(async (req, res) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    const data = await axios({
      method: 'get',
      url: 'http://127.0.0.1:8283/getIt',
      headers: req.headers,
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    res.send(data.toString());
  }),
);
app.get('/*', (req, res) => res.send('Hello World!'));
const server = app.listen(port, () => console.log(`Example app listening on port port!`));

// nodeHttpTracer({
//   tracer,
//   server,
//   onError: ({ message }) => {
//     console.log('on erorr', message);
//   },
// });

axiosHooksTracer({ tracer, axios });
