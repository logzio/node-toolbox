const _ = require('lodash');

function removeCircularFields(log) {
  const map = new WeakMap();
  const noCirculars = v => {
    if (_.isArray(v)) return v.map(noCirculars);
    else if (_.isObject(v)) {
      if (map.has(v)) return '[Circular]';

      map.set(v, undefined);

      for (const key of Object.keys(v)) {
        v[key] = noCirculars(v[key]);
      }
    }

    return v;
  };

  return noCirculars(log);
}

module.exports = { removeCircularFields };
