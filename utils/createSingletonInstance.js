function createSingletonInstance(name = 'instance') {
  let instance = null;
  let __setByProxy__ = false;
  const instanceProxy = new Proxy(
    {},
    {
      set(o, prop, value) {
        if (!instance) throw new Error(`${name} need to be created first`);

        instance[prop] = value;

        return true;
      },
      get(o, prop) {
        if (prop === '__setByProxy__') return __setByProxy__;

        if (!instance) throw new Error(`${name} need to be created first`);

        return instance[prop];
      },
    },
  );

  function setInstance(inst) {
    if (instance) throw new Error(`${name} was already been set`);

    instance = inst;
    __setByProxy__ = true;
  }

  return {
    setInstance,
    instance: instanceProxy,
  };
}

module.exports = {
  createSingletonInstance,
};
