'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class Observable {
  #val;
  #listeners = [];

  constructor(value) {
    this.#val = value;
  }

  set(val) {
    if (this.#val !== val) {
      this.#val = val;
      this.#listeners.forEach(l => l(val));
    }
  }

  get() {
    return this.#val;
  }

  subscribe(listener) {
    this.#listeners.push(listener);
    return () => {
      this.#listeners = this.#listeners.filter(l => l !== listener);
    };
  }
}

class Monitor {
  #intervalId;
  #interval;
  #listeners = [];
  #afterFinish;
  #monitor;

  constructor({ interval = 5000, afterFinish = false, monitor }) {
    this.#interval = interval;
    this.#afterFinish = afterFinish;
    this.#monitor = monitor;
  }

  start({ monitor = this.#monitor, interval = this.#interval, onCall, afterFinish = this.#afterFinish } = {}) {
    if (!this.#intervalId && monitor) {
      const fn = async () => {
        const data = await monitor();
        this.#listeners.forEach(subscriber => subscriber(data));
      };

      if (afterFinish) {
        const warpTimeout = async () => {
          await fn();
          this.#intervalId = setTimeout(warpTimeout, interval);
        };
        setTimeout(warpTimeout, interval);
      } else this.#intervalId = setInterval(fn, interval);
      if (onCall) return this.subscribe(onCall);
    }
  }

  stop() {
    this.#intervalId && clearInterval(this.#intervalId);
  }

  subscribe(onCall) {
    const unsubscribe = () => (this.#listeners = this.#listeners.filter(l => l !== onCall));

    if (onCall in this.#listeners) return unsubscribe;
    this.#listeners.push(onCall);
    return unsubscribe;
  }

  unsubscribe(onCall) {
    this.#listeners = this.#listeners.filter(l => l !== onCall);
  }

  destroy() {
    this.stop();
    this.#listeners = [];
  }
}

function ExportAsync(name = 'instance') {
  let instance = null;
  let __set__ = false;
  const instanceProxy = new Proxy(
    {},
    {
      set(o, prop, value) {
        if (!instance) throw new Error(`${name} need to be created first`);

        instance[prop] = value;

        return true;
      },
      get(o, prop) {
        if (prop === '__set__') return __set__;

        if (!instance) throw new Error(`${name} need to be created first`);

        return instance[prop];
      },
    },
  );

  function setInstance(inst) {
    if (instance) throw new Error(`${name} was already been set`);

    instance = inst;
    __set__ = true;
  }

  return {
    setInstance,
    instance: instanceProxy,
  };
}

exports.ExportAsync = ExportAsync;
exports.Monitor = Monitor;
exports.Observable = Observable;
