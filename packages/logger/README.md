# configured winston logger

## Basic Introduction
a warper for winston with 2 formats built in
 1. console - when working locally it will print simple log
 2. logzio - when working on production it will send the logs to logz.io by the token you supply

## create logger
``` javascript
    const { createLogger, getLogger } = require('@logz-pkg/toolbox');
    const logger = createLogger({ options });

    const otherLogger = getLogger();
    const anotherLogger = createLogger({ options });

    logger === otherLogger === anotherLogger
```
when you call createLogger it will return the same logger because we disable the ability to create 2 loggers on the same instance

## options
#### serviceName :String
the serviceName will be added to the meta data when the log is sent log to logz.io
it should indicate the service serviceName from where the log came (what is today the type)

#### token :String   |optional
logz.io account token

#### host :String   |optional
logz.io listener url provided by logz.io

#### fieldToSlice :Array of Strings   |optional
list of field that should be slice if they are passing the certain amount of byte size

#### maxFieldByteSize :Number   |default: 1000
maximum size in bytes the fields specified by `fieldToSlice` should be cut to

#### fieldsToMask :Array of Objects  |optional
##### each Object { field :String, length: Number   |default: 7  (if set to 0 will mask all field) }
will replace the length specified on each filed with `*` number of length times

#### maxLogSizeBytes :String   |default: 0.5M
maximum size of fields (default: 0.5MB)

#### logIdentifiers :Object
own use identifers that will ne added to the default identifiers

#### disableLogToConsole :Boolean
usually used in production to disable the logging to console

#### metaData :Object
any other meta data that should be added to each log sent to logz.io  (region, env etc...)

'''
