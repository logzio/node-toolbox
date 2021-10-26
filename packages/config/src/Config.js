import Joi from 'joi';
import { Observable } from './Observable';
import _ from 'lodash';
import deepMerge from 'deepmerge';

export class Config {
  #config;
  #schema;
  #observable;
  #observables;

  constructor(schema = null, config = {}) {
    if (schema) this._validateJoi(schema);

    this.#schema = schema;
    this._initializeConfig(config);
  }

  _initializeConfig(config = {}) {
    this.#config = {};
    this._merge(config);
    this.#observables = {};
    this.#observable = new Observable(this.#config);
  }

  _validateJoi(schema) {
    if (schema && !Joi.isSchema(schema)) {
      throw new Error('must pass Joi type schema');
    }
  }

  _merge(newValue, onError = false) {
    const curVales = deepMerge.all([this.#config, newValue]);

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

  setSchema(newSchema, config = this.#config) {
    this._validateJoi(newSchema);

    const { error } = newSchema.validate(config, { abortEarly: false });
    if (error) throw error;
    this.#config = {};
    this.#schema = newSchema;
    this._merge(config);
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

  set({ cleanMerge = false, value = null, key = null, onError = null }) {
    if (value === null) return;
    if (cleanMerge) this._initializeConfig();
    if (key) value = _.set({}, key, value);
    this._merge(value, onError);
    if (key && this.#observables[key]) this.#observables[key].set(this.get(key));
    this.#observable.set(this.#config);
  }

  get(key) {
    if (!key) return this.#config;
    return _.get(this.#config, key);
  }
}
