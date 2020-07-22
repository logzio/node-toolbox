<p align="center">
  <a href="http://logz.io">
    <img height="150px" src="https://logz.io/wp-content/uploads/2017/06/new-logzio-logo.png">
  </a>
</p>

# Logger
lightweight logger base on the concept of transports and formatters.
#### Transports - logs destination (console, s3 etc...).
#### Formatters - mappers function  before logs moved to the transport.

## logging methods:
| method | weight | color | enum |
| --- | --- | --- | --- |
| error | 2 | red | ERROR |
| warn | 4 | yellow | WARN |
| info/log/beatify | 6 | white | INFO | (beatify - will print parsed colorful json )
| debug | 8 | magenta | DEBUG |


## Usage
when creating an instance of logger u need to pass at least one transporter and 0+ formatters
each log will pass through.

each transporter can receive many formatter that will be invoke after all the logger formatters ended.

```javascript
import { Logger, transports, formatters, LogLevel } from '@logzio-node-toolbox/logger';

const logFormatter = formatters.LogSize();

const transportFormatter = formatters.omitFields(['name']);
const consoleTransport1 = new transports.ConsoleTransport({name: 'console-1', formatters: [transportFormatter] });

const consoleTransport2 = new transports.ConsoleTransport({name: 'console-2'});

const logger = new Logger({
  formatters: [logFormatter],
  transports: [consoleTransport1, consoleTransport2],
  metaData: { globalMetaData: 'globalMetaData' }
});

logger.info('hello', { name: 'from', last: 'last' });
// INFO: 18/07/2020 04:07:19.079 hello {"last":"last", logSize: 70 }
// INFO: 18/07/2020 04:07:19.079 hello {"last":"last", name: "from", logSize: 100 }

logger.removeTransport('console-1');

logger.info('hello', { name: 'name', message: 'override' }); // first args always message
// INFO: 18/07/2020 04:07:19.079 hello {"name":"from", logSize: 70 }

logger.info('hello', { name: 'from' }, {last: 'last'}); // concat objects args
// INFO: 18/07/2020 04:07:19.079 hello {"name":"from", last: 'last', logSize: 70 }

logger.info('hello', { name: 'from' }, {last: 'last'}); // concat objects args
// INFO: 18/07/2020 04:07:19.079 hello {"name":"from", last: 'last', logSize: 70 }

logger.info('hello', { name: 'from' }, [1,2,3]); // not objects will push to _logArgs_ array
// INFO: 18/07/2020 04:07:19.079 hello {"name":"from", _logArgs_: [[1,2,3]], logSize: 70 }

logger.info({ name: 'from', last: 'last' }); // first value can also be object
// INFO: 18/07/2020 04:07:19.079 {"name":"from", _logArgs_: [[1,2,3]], logSize: 70 }

logger.logLevel(LogLevel.DEBUG) // will start log debug as well

await logger.close() // will wait for all transports to close

```
## Transports

### ConsoleTransport
log to console
  params
  name - string (default console)
  formatters - array | list of formatters
  logLevel - string (default info) | representing the log level to log
  color - boolean (default true) | adding color to output
```javascript
import { Logger, transports } from '@logzio-node-toolbox/logger';
const logzio = new transports.ConsoleTransport({ name: 'logzioTransport', formatters: [transportFormatter], token:'123', meta: {region: 'prod', } });
```

### LogzioTransport
send the log to logzio with the given token
  params
  name - string (default logzio)
  host - string
  token - string
  type - string (default node-js)
  metaData - object | default data to add to each log
  formatters - array | list of formatters
  logLevel - string (default info) | representing the log level to log
  moreOptions - object (default true) | options to pass to logzio-nodejs
```javascript
import { Logger, transports } from '@logzio-node-toolbox/logger';
const console = new transports.LogzioTransport({ name: 'new-console', formatters: [transportFormatter] });
```

### custom Transport
creating a custom Transport
functions:
logLevel - change log level
close - stop receiving logs
open - start receiving logs


```javascript
import { Logger, transports, formatters  } from '@logzio-node-toolbox/logger';

class CustomTransports extend transports.Transport {
  constructor(name, formatters, logLevel, ...paramsUNeed) {
    super({ name, formatters, logLevel })
  }
  // formatted log will arrive to this log function, so here u can do what u want with the data
  log(data) {
    // do whatever with the data
  }

  // this function will be called and await when closing the logger
  close()
}

const customTransports = new CustomTransports({name: 'myCustomTransports', formatters: [formatters.logSize(100)] })
const logger = new Logger({transports: [ customTransports ] })
  logger.info('hello')
  customTransports.loLevel('DEBUG')
  logger.debug('hello')

```


## Formatters

### omitFields
Array of fields by path string tp remove from the log.
```javascript
import {Logger, formatters } from '@logzio-node-toolbox/logger';

const f = formatters.omitFields(['path.to.omit', 'path.to.omit2']);
const logger = new Logger(formatters: [f]);
logger.log({
  path: {
    to :{
      omit: 'should omit',
      omit2: 'also should omit'
      omit3: 'should not omit'
    }
  }
})
// output: INFO: 18/07/2020 04:07:19.079 { path: { to : { omit3: should not omit } } }
```

### handleError
1. look for err || error || message. err fields make sure they are objects.
2. serialize the error and make sure logLevel is error.
```javascript
import {Logger, formatters } from '@logzio-node-toolbox/logger';

const f = formatters.handleError();
const logger = new Logger(formatters: [f]);
const err = new Error('random error');
logger.log({
  err
})
// output: ERROR: 18/07/2020 04:07:19.079 random error { stack: .... , type: .... }
```

### logSize
1. add logSize field to the log.
2. validate log is size with value pass in bytes.
```javascript
import {Logger, formatters } from '@logzio-node-toolbox/logger';

const f = formatters.logSize(100);
const logger = new Logger(formatters: [f]);
logger.log('message with log size', { field: 'random' });
// output: INFO: 18/07/2020 04:07:19.079 message with log size { logSize: 40 }

const f = formatters.logSize(30);
const logger = new Logger(formatters: [f]);
logger.log('message with log size', { field: 'random' });
// output: INFO: 18/07/2020 04:07:19.079 Log exceeded the max bytes size {logObjectKeys: ['message', 'field'] maxLogSize: 30 }
```

### maskFields
mask fields by the length was received with *
params
 list - {{ field: string, length?: number  }}
 length - number (default 7)
```javascript
import {Logger, formatters } from '@logzio-node-toolbox/logger';

const f = formatters.maskFields([{field: 'password', length: 6 }], 10);
const logger = new Logger(formatters: [f]);
logger.log({
  field: 'random',
  password: '12345678',
  ip: '123.123.123.123',
  });
// output: INFO: 18/07/2020 04:07:19.079 message with log size { field: 'random', password: '**345678', ip: '****23.123.123' }
```

### pickFields
will omit all object property except the given array
 params
 fieldName - string
 list - array if strings
 flatten - will flat the omit fields to the root of the log |  default false
```javascript
import {Logger, formatters } from '@logzio-node-toolbox/logger';

const f = formatters.pickFields('req', ['port', 'host'], true);
const logger = new Logger(formatters: [f]);
logger.info("incoming" ,{req: {port: '3000', host: 'localhost', ip: "127.0.0.1" }});
// INFO: 18/07/2020 04:07:19.079 {"message":"incoming", "port": "3000", host: "localhost"}

const f = formatters.pickFields('req', ['port', 'host'], false);
logger.info("incoming" ,{req: { port: '3000', host: 'localhost', ip: "127.0.0.1" }});
// INFO: 18/07/2020 04:07:19.079 {"message":"incoming", req: { "port": "3000", host: "localhost"} }
```

### removeCircularFields
iterate over the log and remove all circular fields
```javascript
import {Logger, formatters } from '@logzio-node-toolbox/logger';

const f = formatters.removeCircularFields();
const logger = new Logger(formatters: [f]);

const a = {name : 'name'};
a.b = a;
logger.info(a);
// INFO: 18/07/2020 04:07:19.079 {"name":"name", "b": [Circular] }
```

### renameFields
rename fields from to path to path
```javascript
import {Logger, formatters } from '@logzio-node-toolbox/logger';

const f = formatters.renameFields({'path.to.field.rename': 'name.to.field. newName' });
const logger = new Logger(formatters: [f]);

logger.info({ path: { to : {field : { rename: "some value"}}}});
// INFO: 18/07/2020 04:07:19.079 { path: { to : {field : { newName: "some value"}}}}
```

### sliceFields
params
list - array of paths to slice  (if field is object will stringify it before slice)
size - size to slice

```javascript
import {Logger, formatters } from '@logzio-node-toolbox/logger';

const f = formatters.sliceFields(['path.to.slice'], 10);
const logger = new Logger(formatters: [f]);

logger.info({ path: { to : { slice : { "some value to slice if its to long" }}}});
// INFO: 18/07/2020 04:07:19.079 { path: { to : {slice: "some value to..."}}}}
```