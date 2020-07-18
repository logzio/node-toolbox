import _ from 'lodash';
export function removeCircularFields() {
  return function removeCircularFieldsLog(log) {
    const map = new WeakMap();
    const noCirculars = v => {
      if (_.isArray(v)) return v.map(noCirculars);
      else if (_.isObject(v)) {
        if (map.has(v)) return '[Circular]';

        map.set(v, undefined);

        for (const key of Object.keys(v)) {
          try {
            v[key] = noCirculars(v[key]);
          } catch (err) {
            console.log(`unable to set key on removeCircularFields ${key}`);
          }
        }
      }

      return v;
    };
    return noCirculars(log);
  };
}
