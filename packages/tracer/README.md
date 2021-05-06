<p align="center">
  <a href="http://logz.io">
    <img height="150px" src="https://logz.io/wp-content/uploads/2017/06/new-logzio-logo.png">
  </a>
</p>

## TRACER

create a tracer by passing configuration with build-in defaults.
params:
  serviceName - string (node-js)
  tags - object | key value of tags to add to each span
  carrierType - string (http-header) | opentracing carrier types
  debug - boolean (false) | print spans on finish, and set sampler to 1 const 1
  shouldIgnore - function | ignore spans by the operation name
  onStartSpan - function | will call function with created span
  onFinishSpan - function | will call function before closing the span
  exporterOptions - object | configure the exporter
          type - string (const) | jaeger exporter types
          probability - number (1) | jaeger exporter probability
          host - string (localhost) | jaeger exporter host
          port - number (6832) | jaeger exporter port
          interval - number (2000) | jaeger exporter flush interval

```javascript
import { Tracer } from '@logzio-node-toolbox/tracer;

const config = {
  serviceName: 'client-api',
  exporterOptions: {
    host: '127.0.13.1',
    interval: 5000,
  },
  tags: {
    region: 'us',

  },
  shouldIgnore: (url) => {
    if url.includes('ignore path') return true;
    return false;
  },
  onStartSpan: (span) => {
    span.addTag()
  }
}
const tracer = new Tracer(config);

const span = tracer.startSpan({operation: 'operationName', tags: { default: 'tags for this span' }, carrier: req.headers });

tracer.finishSpan({ span: span, tags: { default: 'tags for finish span' }});
```
