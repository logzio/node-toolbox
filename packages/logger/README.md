<p align="center">
  <a href="http://logz.io">
    <img height="150px" src="https://logz.io/wp-content/uploads/2017/06/new-logzio-logo.png">
  </a>
</p>

# Logger
lightweight logger base on winston concept of transports and formatters.

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

logger.logLevel(LogLevel.DEBUG) // will start log debug  as well

await logger.close() // will wait for all transports to close

```

## Formatters

### omitFields
Array of fields by path string tp remove from the log.
```javascript
import { formatters } from '@logzio-node-toolbox/logger';

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
will look for err || error || message. err fields make sure they are objects,
will serialize it and make sure logLevel is error.
```javascript
import { formatters } from '@logzio-node-toolbox/logger';

const f = formatters.handleError();
const logger = new Logger(formatters: [f]);
const err = new Error('random error');
logger.log({
  err
})
// output: ERROR: 18/07/2020 04:07:19.079 random error { stack: .... , type: .... }
```

### logSize
will add logSize field to the log.
will make sure log is not bigger than the value pass in bytes.
```javascript
import { formatters } from '@logzio-node-toolbox/logger';

const f = formatters.logSize(100);
const logger = new Logger(formatters: [f]);
logger.log('message with log size', { field: 'random' });
// output: INFO: 18/07/2020 04:07:19.079 message with log size { logSize: 40 }


const f = formatters.logSize(30);
const logger = new Logger(formatters: [f]);
logger.log('message with log size', { field: 'random' });
// output: INFO: 18/07/2020 04:07:19.079 Log exceeded the max bytes size {logObjectKeys: ['message', 'field'] maxLogSize: 30 }
```




const f = formatters.logSize(100);
/*
  attach logSize field and check log size no bigger than number passed by bytes
  if value is bigger than change log to current format:
  {
    logObjectKeys: Object.keys(log),
    message: 'Log exceeded the max bytes size',
    maxLogSize: maxLogSizeBytes,
  }
*/

const f = formatters.maskFields([{field: 'password', length: 6 }], 10);
/*
mask passed fields with each length mention,
if length == 0 will mask all
if length not define will use the default (10 in this example)
*/


const f = formatters.pickFieldsOfProperty('req', ['port', 'host'], false);
logger.info("incoming" ,{req: {port: '3000', host: 'localhost', ip: "127.0.0.1" }});
// INFO: 18/07/2020 04:07:19.079 {"message":"incoming", "port": "3000", host: "localhost"}
const f = formatters.pickFieldsOfProperty('req', ['port', 'host'], true);
logger.info("incoming" ,{req: { port: '3000', host: 'localhost', ip: "127.0.0.1" }});
// INFO: 18/07/2020 04:07:19.079 {"message":"incoming", req: { "port": "3000", host: "localhost"} }
/*
revest to omit choose only fields u need from type of fields
param1 - name of the field
param2 - array of properties to keep
param3 - should flat the left properties the main root of the log
*/

const f = formatters.removeCircularFields();
// will iterate over the log and remove all circular fields

const f = formatters.renameFields({'path.to.field.to.rename': 'name.to.rename.to' });
// will rename fields from to

const f = formatters.sliceFields(['path.to.field.to.slice'], 1000);
// will slice the given list of fields if are bigger the the value

```



