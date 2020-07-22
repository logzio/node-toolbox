<p align="center">
  <a href="http://logz.io">
    <img height="150px" src="https://logz.io/wp-content/uploads/2017/06/new-logzio-logo.png">
  </a>
</p>

# Config
an efficient config manager based on Joi schema for better easy managing configurations

## Usage
```javascript
import { Config } from '@logzio-node-toolbox/config';

const schema = {}; // Joi schema or array of Joi schemas (in case or array will merge the schemas)

const defaults = {}; // defaults to override the schema defaults (use to pass defaults per region or environment)

const overrides = {}; // configs that could never be override even when try to set (usually environment variables)

const config = new Config({ schema, defaults, overrides });
```

### get value
use path to fetch nested value, if empty will fetch the all config
```javascript
const value = config.get('path.to.value');
```

### set value
use path in key property to set nested values, if empty will mergeDeep from root

onError - callback for when validation error with the schema, if onError return true will continue with the merge config even if not valid
```javascript
config.set({ value: {}, key = 'path.to.set', onError: (err) => {
  console.log(err)
  return true;
} })
```

### subscribe
onChange - callback to invoke when value changed
if key is empty will watch all config

return unSubscribe method

```javascript
const unSubscribe = config.subscribe({ key: 'path.to.value.to.watch', onChange: (value) => {
  console.log("new value:", value);
}})

unSubscribe(); // stop watching value
```
