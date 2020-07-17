import Joi from '@hapi/joi';
import { validateAndGetJoiSchema } from '../src/helpers.js';

describe('config - helpers', () => {
  it('validateAndGetJoiSchema - should concat object or schemas to one', () => {
    const a = {
      teams: Joi.object({
        name: Joi.string().default('first name'),
      }).default(),
    };

    const b = Joi.object({
      teams: Joi.object({
        last: Joi.string().default('last name'),
      }).default(),
      teams2: Joi.object({
        last: Joi.string().default('last name2'),
      }).default(),
    });

    const finalSchema = validateAndGetJoiSchema([a, b]);
    const { value } = finalSchema.validate({});

    expect(value).toEqual({
      teams: { name: 'first name', last: 'last name' },
      teams2: { last: 'last name2' },
    });
  });

  it('validateAndGetJoiSchema - should create schema from object', () => {
    const a = {
      teams: Joi.object({
        name: Joi.string().default('first name'),
      }).default(),
    };

    const finalSchema = validateAndGetJoiSchema(a);
    const { value } = finalSchema.validate({});

    expect(value).toEqual({
      teams: { name: 'first name' },
    });
  });
});
