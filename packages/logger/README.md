# Logger
extremely lightweight logger base on winston concept of transports and formatters

transports - the end target to where the data should go (console, s3 etc...)
formatters - mappers function to pass the log data throw to add/remove/change the log

## Usage
### log methods: log, info, error, warn, debug, beautify (show json in readable way with colors on console transport only)


```javascript
import { Logger, transports, formatters, LogLevel } from '@logzio-node-toolbox/logger';

const logSizeFormatter = formatters.LogSize();


const omitFormatter = formatters.omitFields(['name']);
const consoleTransport1 = new transports.ConsoleTransport({name: 'console-1', formatters: [omitFormatter] });

const consoleTransport2 = new transports.ConsoleTransport({name: 'console-2'});

const logger = new Logger({
  formatters: [logSizeFormatter],
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

## current formatters
```javascript
import { formatters } from '@logzio-node-toolbox/logger';


const f = formatters.omitFields(['path.to.omit']);
// remove fields by path

const f = formatters.handleError();
// find err or error or message.err serialize it and change logLevel to error

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



