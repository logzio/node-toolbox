import LogzioLogger from 'logzio-nodejs';
import { Transport } from './Transport.js';

export class LogzioTransport extends Transport {
  constructor({ host, type, token, metaData = {}, name = 'logzio', formatters = [], logLevel = null, ...moreOptions } = {}) {
    super({ name, formatters, logLevel });
    if (!token) throw new Error('must include logz.io token');

    this.host = host;
    this.token = token;
    this.name = name;
    this.type = type;
    this.extraFields = metaData;
    this.moreOptions = moreOptions;
    this._createLogger();
  }

  _createLogger() {
    const { host, token, name, extraFields, moreOptions } = this;
    this.logzIoLogger = LogzioLogger.createLogger({ host, token, name, extraFields, moreOptions });
    this.isOpen = true;
  }

  log({ timestamp, ...data }) {
    this.logzIoLogger.log(data);
  }

  close() {
    return new Promise(resolve => {
      if (!this.logzIoLogger) resolve();

      this.logzIoLogger.sendAndClose(() => {
        this.isOpen = false;
        resolve();
      });
    });
  }

  async replaceToken(newToken) {
    if (!this.token || !newToken || this.token === newToken) return;
    await this.close();
    this.token = newToken;
    this._createLogger();
  }
}
