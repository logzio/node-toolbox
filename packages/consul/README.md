<p align="center">
  <a href="http://logz.io">
    <img height="150px" src="https://logz.io/wp-content/uploads/2017/06/new-logzio-logo.png">
  </a>
</p>

# consul
easy to use warper for consul to register to service discovery and get, merge and watch keys

## Usage
```javascript
import { Consul } from '@logzio-node-toolbox/consul';
  /* params
    port:  number |  -must-
    host: string | localhost
    connectMaxRetries:  number | 5
    connectTimeout: number | 5000
    connectRetryBackoffFactor: number | 2
    failOnFailedConnection: boolean | true
    watchBackoffFactor: number | 100,
    watchBackoffMax: number | 30000,
    watchMaxAttempts: number,
    baseUrl: string,
    logger: logger instance,
  */
const consul = new Consul({ port: 18500 });
```

## methods
validateConnected - make use connected to consul service (will retry (connectMaxRetries) of times);
get(key) - will get a key from consul service
set(key, value) - will set value
keys(path) - list of keys in path
merge(key, values) - deepmerge values with key
watch(fn => ({key, onChange})) - will listen when key changed and invoke onChange
     onChange will received the new ({key ,vale})

register({ meta, checks, address, hostname, serviceName, port, registerInterval }) - will register to service discovery and with given params will interval to make sure service is still registered
close() - deregister and close all watchers


# multiConsul
extend  consul to work on multiple keys and merged config
```javascript
import { MultiConsul } from '@logzio-node-toolbox/consul';
  /* params
    port:  number |  -must-
    host: string | localhost
    connectMaxRetries:  number | 5
    connectTimeout: number | 5000
    connectRetryBackoffFactor: number | 2
    failOnFailedConnection: boolean | true
    watchBackoffFactor: number | 100,
    watchBackoffMax: number | 30000,
    watchMaxAttempts: number,
    baseUrl: string,
    logger: logger instance,
  */

const consul = new MultiConsul({ port: 18500, paths:['config1', 'config2', 'config3'] });
/*
config1 in consul:
{
  "key1": "value1"
  key2": "value1"
  key3": "value1"
}

config2 in consul:
{
  key2": "value2"
}
 // no config 3
*/

const values = await consul.getAll() // {key1: value1, key2: value2, key3: value1};

watchAll(({ key, value, changedValue }) => {
  /* settings new consul file config3
    { key: value3 }
    will invoke watch with
    key: config3
    changedValue: { key: value3 }
    values: {key1: value1, key2: value2, key3: value3};
  */
})


```

