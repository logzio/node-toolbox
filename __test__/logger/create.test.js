const { create } = require('../../logger/create');
const { LogLevel } = require('../../logger/LogLevel');

describe('logz.io pre config logger', () => {
  it('should pass through all formaters and log in all transports', () => {
    const formater1 = jest.fn().mockImplementation(data => ({ ...data, moreData: 'yes' }));
    const formater2 = jest.fn().mockImplementation(data => ({ ...data, moreData2: 'yes2' }));
    const formatters = [formater1, formater2];

    const transport1 = jest.fn();
    const transport2 = jest.fn();
    const transports = [
      { log: transport1, logLevel: LogLevel.INFO },
      { log: transport2, logLevel: LogLevel.INFO },
    ];
    const logger = create({ formatters, transports });
    const data = { name: 'alonShakran' };

    logger.info(data);

    expect(formater1.mock.calls[0][0].name).toEqual(data.name);
    expect(formater1.mock.calls[0][0].logLevel).toEqual('INFO');
    expect(formater2.mock.calls[0][0].name).toEqual(data.name);
    expect(formater2.mock.calls[0][0].logLevel).toEqual('INFO');
    expect(formater2.mock.calls[0][0].moreData).toEqual('yes');

    expect(transport1.mock.calls[0][0].logLevel).toEqual('INFO');
    expect(transport1.mock.calls[0][0].moreData).toEqual('yes');
    expect(transport1.mock.calls[0][0].moreData2).toEqual('yes2');

    expect(transport2.mock.calls[0][0].logLevel).toEqual('INFO');
    expect(transport2.mock.calls[0][0].moreData).toEqual('yes');
    expect(transport2.mock.calls[0][0].moreData2).toEqual('yes2');
  });

  it('should ignore debug', () => {
    const transport1 = jest.fn();
    const transport2 = jest.fn();
    const transports = [
      { log: transport1, logLevel: LogLevel.INFO },
      { log: transport2, logLevel: LogLevel.DEBUG },
    ];
    const logger = create({ transports });
    const data = { name: 'alonShakran' };

    logger.debug(data);

    expect(transport2).toBeCalledTimes(1);
    expect(transport1).toBeCalledTimes(0);
  });

  it('should convert message to oject with message inside', () => {
    const formater = jest.fn();

    console.warn = jest.fn();

    const logger = create({ formatters: [formater] });

    logger.error('message');
    expect(console.warn).toBeCalledTimes(1);
    expect(formater.mock.calls[0][0]).toBeInstanceOf(Object);
    expect(formater.mock.calls[0][0].message).toEqual('message');
    expect(formater.mock.calls[0][0].logLevel).toEqual('ERROR');
  });
});
