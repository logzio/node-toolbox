import Joi from '@hapi/joi';
import _ from 'lodash';

export function validateAndGetJoiSchema(schema) {
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
