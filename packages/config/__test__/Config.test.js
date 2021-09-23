import { Config } from '../src/Config.js';
import Joi from 'joi';

describe('Config - create config with schema', () => {
  it('should throw if schema is not Joi type', () => {
    expect(() => new Config({ nope: 'nope' })).toThrow('must pass Joi type schema');
  });

  it('should start with default values from schema', () => {
    const schema = Joi.object({
      teams: Joi.object({
        name: Joi.string().default('first name'),
        last: Joi.string().default('last name'),
      }).default(),
    });
    const config = new Config(schema);
    expect(config.get()).toEqual({
      teams: {
        name: 'first name',
        last: 'last name',
      },
    });
  });

  it('should throw error if default not valid', () => {
    const schema = {
      teams: Joi.object({
        name: Joi.string().default('first name'),
        last: Joi.string().default('last name'),
      }).default(),
    };
    const configs = {
      teams: {
        name: 123,
      },
    };
    expect(() => new Config(schema, configs)).toThrow('must pass Joi type schema');
  });

  it('should override with defaults if they are valid', () => {
    const schema = Joi.object({
      teams: Joi.object({
        name: Joi.string().default('first name'),
        last: Joi.string().default('last name'),
      }).default(),
    });

    const configs = {
      teams: {
        name: 'first name override',
      },
    };
    const config = new Config(schema, configs);
    expect(config.get()).toEqual({
      teams: {
        name: 'first name override',
        last: 'last name',
      },
    });
  });

  it('should throw error if defaults are not valid', () => {
    const schema = Joi.object({
      teams: Joi.object({
        name: Joi.string().default('first name'),
        last: Joi.string().default('last name'),
      }).default(),
    });

    const configs = {
      teams: {
        name: 123,
      },
    };
    expect(() => new Config(schema, configs)).toThrow('"teams.name" must be a string');
  });

  it('should throw error if setSchmea is not Joi', () => {
    const schema = Joi.object({
      teams: Joi.object({
        name: Joi.string().default('first name'),
        last: Joi.string().default('last name'),
      }).default(),
    });

    const config = new Config(schema);
    const newSchema = Joi.object({
      teams: Joi.object({
        name1: Joi.string().default('first name1'),
        last1: Joi.string().default('last name1'),
      }).default(),
    });

    expect(() => config.setSchema(newSchema)).toThrow(`"teams.name" is not allowed. "teams.last" is not allowed`);
    config.setSchema(newSchema, { teams: { last1: 'last name1 overide' } });

    expect(config.get('teams.name1')).toEqual('first name1');
    expect(config.get('teams.last1')).toEqual('last name1 overide');
  });

  it('should set value by string or object if valid', () => {
    const schema = Joi.object({
      teams: Joi.object({
        name: Joi.string().default('first name'),
      }).default(),
    });

    const config = new Config(schema);

    expect(config.get('teams.name')).toEqual('first name');
    config.set({ value: { teams: { name: 'override name' } } });
    expect(config.get('teams.name')).toEqual('override name');
    config.set({ value: 'override name2', key: 'teams.name' });
    expect(config.get('teams.name')).toEqual('override name2');
  });

  it('should not merge not valid if onError return false', () => {
    const schema = Joi.object({
      teams: Joi.object({
        name: Joi.string().default('first name'),
      }).default(),
    });

    const config = new Config(schema);

    let onErrorCalled = false;
    const onError = err => {
      onErrorCalled = true;
      expect(err.message).toEqual('"teams.name" must be a string');
      return false;
    };
    config.set({ value: 123, key: 'teams.name', onError });
    expect(config.get()).toEqual({ teams: { name: 'first name' } });
    expect(onErrorCalled).toEqual(true);
  });

  it('should merge not valid if onError return true', () => {
    const schema = Joi.object({
      teams: Joi.object({
        name: Joi.string().default('first name'),
      }).default(),
    });

    const config = new Config(schema);

    let onErrorCalled = false;
    const onError = err => {
      onErrorCalled = true;
      expect(err.message).toEqual('"teams.name" must be a string');
      return true;
    };
    config.set({ value: 123, key: 'teams.name', onError });
    expect(config.get()).toEqual({ teams: { name: 123 } });
    expect(onErrorCalled).toEqual(true);
  });

  it('should subscribed & unsubscribed specific and global value', () => {
    const schema = Joi.object({
      teams: Joi.object({
        name: Joi.string().default('name'),
        last: Joi.string().default('last'),
      }).default(),
    });

    const config = new Config(schema);

    let amountCalledOnChangeName = 0;
    const onChangeName = newVal => {
      amountCalledOnChangeName++;
      expect(newVal).toEqual('name2');
    };

    let amountCalledOnChangeGlobal = 0;
    const onChangeGlobal = newVal => {
      amountCalledOnChangeGlobal++;
      if (amountCalledOnChangeGlobal == 1) {
        expect(newVal).toEqual({
          teams: {
            name: 'name2',
            last: 'last',
          },
        });
      }

      if (amountCalledOnChangeGlobal == 2) {
        expect(newVal).toEqual({
          teams: {
            name: 'name2',
            last: 'last2',
          },
        });
      }
    };

    const unSubName = config.subscribe({ onChange: onChangeName, key: 'teams.name' });
    const unSubGlobal = config.subscribe({ onChange: onChangeGlobal });

    config.set({ value: 'name2', key: 'teams.name' });
    config.set({ value: 'last2', key: 'teams.last' });

    expect(config.get()).toEqual({ teams: { name: 'name2', last: 'last2' } });
    unSubName();
    unSubGlobal();

    config.set({ value: { teams: { name: 'name3' } } });

    expect(config.get()).toEqual({ teams: { name: 'name3', last: 'last2' } });

    expect(amountCalledOnChangeName).toEqual(1);
    expect(amountCalledOnChangeGlobal).toEqual(2);
  });
});
