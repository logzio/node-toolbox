'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _ = _interopDefault(require('lodash'));
var utils = require('@logzio-node-toolbox/utils');
var deepMerge = _interopDefault(require('deepmerge'));
var Joi = _interopDefault(require('@hapi/joi'));

function validateAndGetJoiSchema(schema) {
  let finalSchema;

  if (_.isArray(schema)) {
    finalSchema = schema.reduce((curSchema, newSchema) => {
      if (!Joi.isSchema(newSchema)) newSchema = Joi.object(newSchema);
      curSchema = curSchema.concat(newSchema);
      return curSchema;
    }, Joi.object());
  } else {
    if (schema.isJoi) finalSchema = schema;
    else finalSchema = Joi.object(schema);
  }

  return finalSchema;
}

class Config {
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
    this.#observable = new utils.Observable(this.#config);
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
      this.#observables[key] = new utils.Observable(this.get(key));
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

exports.Config = Config;
