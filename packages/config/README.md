# warper for all our configurations

## Basic Introduction
Until we could use the backend configuration service to fetch config we using this config manager.
configuration for each service stored in the consul server (local: `http://consul:18500/`)
the configuration are arrange by environment folders: local, staging, prod.

on each environment folder there are 2 type of configuration files:
- the shared configuration, that all micro services should load and use.
- the micro services specific configuration.
on each environment folder, there is also a folder for each region we support: us, eu, we, ca, au.
on each region folder there are also up to 2 type of configuration files:
- the region shared configuration, that all micro services on that region should load and use.
- the region micro services specific configuration.


### the order of loading
when micro service starts it load configuration by this order:
1. environment shared config.
2. region shared config (if exist).
3. environment specific config  (if exist).
4. region specific config  (if exist).
each one should merge & overwrite the one above it.

example:
files tree:
   - prod
      - us
         * shared.json (2)
         * app-api.json (4)
      - eu
         * shared.json
         * app-api.json
      * shared.json (1)
      * app-api.json (3)

if app-api micro service starts in prod-us,
it will load number 1 the shared.json from the prod folder.
than overwrite it with number 2 the shared.json from the prod/us folder
than overwrite it with number 3 the app-api.json from the prod folder
than overwrite it with number 4 the app-api.json from the prod/us folder


## implementation
the configuration code is split into 4 parts:

### configs folder (node-toolbox/config/configs)
here we define all our shared configuration defaults and each micro service configuration defaults using joi schemas.
shared.js contain the shared configuration schema for all micro services,
each other file extend the shared.js file schema and add its own specific configuration schema.
when creating a new micro-services u must add a new file with name identical to the micro-service name
u can use the template.js as an example.

### consul.js file
create a client that connected to to the consul server to fetch and watch configuration.
also used to register and deregister to/from service discovery (that is being handle by the consul server).

exported a function `Consul` that  create a singleton client (to prevent multiple connection to consul)
and stored it under the exported object `consul`.

### loadConfiguration.js:
using the consul client return a merged environment and environment/region configuration,
by the name passed to it.
from the example above:
 if passed "shared" it will merge to one object, file 1 and file 2 and return it.
 if passed "app-api" it will merge to one object, file 3 and file 4 and return it.

### configManager.js:
when passed a serviceName it will load 2 configuration (using loadConfiguration.js)
the "shared" (merged 1 & 2)
and the serviceName passed to it (if "app-api" so merged 3 & 4)
than it will merge those 2 together, hence completing the 4 steps of overwrite merge configuration.
than it will validate the 1 configuration with the provided schema of the service from the configs folder


## Use
``` javascript
   const { createConfigManager, config } = require('@logz-pkg/toolbox');
   await createConfigManager({ options });

    const port  = config.get('port');

```
### options

#### serviceName :String
the service name to load config for (must have an existing config.js file in the configs folder)

#### env :String
coacted to the confName fo fetch the configuration per environment (prod / staging)

#### region :String
coacted to the confName and env  fo fetch the configuration per region (us / eu)

#### consulOptions |Object
consul options to connect to consul
   - host :String
   - port :Number
   - backoffFactor :Number
   - backoffMax :Number
   - tryInterval :Number (default: 2000)
   - connectTimeout :Number (default: 5000)
   - failOnFailedConnection :Boolean (default: true)
   - maxRetries :Number (default: 5)

## methods:

#### get: return value from configuration or undefined if not found
``` javascript
   const apiToken = config.get('api.token') ;
```
#### subscribeToConfigChange: will listen to changes in the configurations
``` javascript
   config.subscribeToConfigChange(({ value, error, path }) =>  {
      if (error) throw new Error('asd')
      console.log(value);
   });
```
#### getRegionSpecificConfig: return configuration for a different region from the one loaded in the beginning
``` javascript
   const configurations = await config.getRegionSpecificConfig('eu');
```
#### getLoggerConfiguration: return logger host and token;
``` javascript
   const { host, token } = config.getLoggerConfiguration();
```

#### getMetricsConfiguration: return metrics host and token;
``` javascript
   const { host, token, interval } = config.getMetricsConfiguration();
```

#### consul: the instance of the consul that the config is using