import _ from 'lodash';
import { Observable } from '@madvinking/utils';
import deepMerge from 'deepmerge';
import { validateAndGetJoiSchema } from './helpers.js';

export class Config {
  #config;
  #schema;
  #observable;
  #observables;
  #overrides;

  constructor({ schema, defaults = {}, overrides = {} } = {}) {
    if (!schema) throw new Error('must pass Joi type schema');

    this.#config = {};
    this.#observables = {};
    this.#schema = validateAndGetJoiSchema(schema);
    this.#overrides = _.pickBy(overrides);
    this.#observable = new Observable(this.#config);
    this._merge({ value: defaults });
  }

  _merge({ value, onError } = {}) {
    const curVales = deepMerge.all([this.#config, value, this.#overrides]);
    const { error, value: validated } = this.#schema.validate(curVales, { abortEarly: false });

    if (!error) {
      this.#config = validated;
    } else if (onError) {
      if (onError(error)) {
        const { value: newValidated } = this.#schema.validate(curVales, {
          allowUnknown: true,
          abortEarly: false,
        });

        this.#config = newValidated;
      }
    } else throw error;
  }

  subscribe({ key = null, onChange }) {
    if (!onChange) return;
    if (!key) {
      return this.#observable.subscribe(onChange);
    } else if (!this.#observables[key]) {
      this.#observables[key] = new Observable(this.get(key));
    }
    return this.#observables[key].subscribe(onChange);
  }

  set({ value, key, onError }) {
    if (!value) return;
    if (key) value = _.set({}, key, value);
    this._merge({ value, onError });

    Object.entries(this.#observables).forEach(([key, obs]) => {
      obs.set(this.get(key));
    });
    this.#observable.set(this.#config);
  }

  get(key) {
    if (!key) return this.#config;
    return _.get(this.#config, key);
  }
}
