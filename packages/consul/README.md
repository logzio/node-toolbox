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

const consul = new Consul({ port: 18500, host: '127.0.0.1', baseUrl = 'some_base_url' });
```
initialized params:
1. port - consul port to connect default 8500 (default 8500)
2. host - consul host to connect default 8500 (default localhost)
3. baseUrl - some default path to load configs from, will prefix the path to each get request (default '')
4. validateOptions - object with defaults { fail: true, timeout: 5000, retries: 6, factor: 2, onRetry: null }
    can override each one of the defaults.
5. defaultWatchOptions - object with defaults { backoffFactor: 100, backoffMax: 30000, maxAttempts: 10000 }
    can override each one of the defaults.
6. defaultRegisterRetryOptions - object with defaults { factor: 2, retries: 6, onRetry: null }
    can override each one of the defaults.

## methods
### validateConnected - make use connected to consul service (will retry (connectMaxRetries) of times);
receive same params as validateOptions and will merge with th one passed to the initializer
```javascript
  await consul.validateConnected(validateOptions)
```

### get - will get a key from consul service, (if initlized with base path it will prefix it)
```javascript
  const { key, value } = await consul.get('somepath/config.json')
  // if have base path will fetch 'some_base_url/somepath/config.json'
```

### set - will set a value to consul, (if initlized with basebath it will prefix it)
```javascript
   await consul.set({key: 'somepath/config.json', value: {some: "value"}})
  // if have base path will set to 'some_base_url/somepath/config.json'
```

### keys - list of keys in path
```javascript
   await consul.keys('somepath/config.json')
```

### merge - deepmerge current values with new values
it will fetch current values will deep merge all keys and set it
```javascript
   await consul.merge({key: 'somepath/config.json', value: {toOverride: "newValue" }})
```

### watch - listen to key change and invoke handler
receive same watchOptions object as the initializer ( will merge them together)
```javascript
   await consul.watch({
   key: 'somepath/config.json',
   onChange: ({key, value}) => {
       console.log(key)
       console.log(value) // new values
   },
   onError:(err) => {
    console.log(err)
   },
   watchOptions
   })
```

### register - will register service to consul
receive same registerRetryOptions object as the initializer ( will merge them together)
```javascript
    interface RegisterData {
      meta?: AnyObject;
      checks?: AnyObject;
      address?: string;
      id?: string;
      name?: string;
      port?: number;
    }

   await consul.register({
   data,
   registerRetryOptions
   })
```

### registerInterval - will create interval to validate service always register to consul
receive same registerRetryOptions object as the initializer ( will merge them together)
```javascript
    interface RegisterData {
      meta?: AnyObject;
      checks?: AnyObject;
      address?: string;
      id?: string;
      name?: string;
      port?: number;
    }

   await consul.register({
   data,
   interval: 3000,
   onError:(err) => {
    console.log(err)
   },
   registerRetryOptions
   })
```


#### close - deregister and close all watchers
receive same registerRetryOptions object as the initializer ( will merge them together)
```javascript
   await consul.close(registerRetryOptions)
```


# multiConsul
extend  consul to work on multiple keys and merged config
```javascript
import { MultiConsul } from '@logzio-node-toolbox/consul';
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

