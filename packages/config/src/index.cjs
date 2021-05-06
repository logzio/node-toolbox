'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var _ = require('lodash');
var Joi = require('joi');
var deepMerge = require('deepmerge');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var ___default = /*#__PURE__*/_interopDefaultLegacy(_);
var Joi__default = /*#__PURE__*/_interopDefaultLegacy(Joi);
var deepMerge__default = /*#__PURE__*/_interopDefaultLegacy(deepMerge);

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

class Config {
  #config;
  #schema;
  #observable;
  #observables;

  constructor(schema = null, config = {}) {
    if (!schema || !Joi__default['default'].isSchema(schema)) throw new Error('must pass Joi type schema');
    this.#config = {};
    this.#schema = schema;
    this._merge(config);
    this.#observables = {};
    this.#observable = new Observable(this.#config);
  }

  _merge(newValue, onError = false) {
    const curVales = deepMerge__default['default'].all([this.#config, newValue]);

    const { error, value } = this.#schema.validate(curVales, { abortEarly: false });

    if (!error) {
      this.#config = value;
    } else if (onError) {
      if (onError(error)) {
        const { value } = this.#schema.validate(curVales, {
          allowUnknown: true,
          abortEarly: false,
        });
        this.#config = value;
      }
    } else {
      throw error;
    }
  }

  subscribe({ onChange, key = null }) {
    if (!onChange) return;
    if (!key) {
      return this.#observable.subscribe(onChange);
    } else if (!this.#observables[key]) {
      this.#observables[key] = new Observable(this.get(key));
    }
    return this.#observables[key].subscribe(onChange);
  }

  set({ value = null, key = null, onError }) {
    if (value === null) return;
    if (key) value = ___default['default'].set({}, key, value);
    this._merge(value, onError);
    if (key && this.#observables[key]) this.#observables[key].set(this.get(key));
    this.#observable.set(this.#config);
  }

  get(key) {
    if (!key) return this.#config;
    return ___default['default'].get(this.#config, key);
  }
}

exports.Config = Config;
