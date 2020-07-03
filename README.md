# warper for all our configurations

## Basic Introduction
a warper for configurations fo easy use
when working locally it will try to fetch config from consul and if the consul isn't available it will fall back to
the default schema
   - listen to consul configuration paths the config name and the region config name
   - merge them together to one configurations
   - will validate configurations with current schema

## create config
``` javascript
    const { createConfig, config } = require('@logz-pkg/toolbox');
    const config = createConfig({ options });


```
## options

#### consulOptions  |optional
consul options to connect to consul

#### schema :Object
the schema to validate configuration by and use as default if no configuration available

#### confName :String   |optional
should be supplied if consul also supplied the key to fetch configuration from consul

#### env :String  |optional
coacted to the confName fo fetch the configuration per environment (prod / staging)

#### region :String  |optional
coacted to the confName and env  fo fetch the configuration per region (us / eu)

#### name :String  |optional
must be passed in order to create a second configuration object


## methods:

### get: return value from configuration or undefined if not found
``` javascript
   const apiToken = config.get('api.token') ;
```
### subscribeToConfigChange: will listen to changes in the configurations
``` javascript
   config.subscribeToConfigChange(({ value, error }) =>  {
      if (error) throw new Error('asd')
      console.log(value);
   });
```

### getRegionSpecificConfig: return configuration for a different region from the one loaded in the beginning
``` javascript
   const configurations = await config.getRegionSpecificConfig('eu');
```

### getLoggerConfiguration: return logger host and token;
``` javascript
   const { host, token } = config.getLoggerConfiguration();
```

### consul: the instance of the consul that the config is using