import path from 'path';
import fs from 'fs';
import http from 'http';
import url from 'url';
import kill from 'kill-port';
const { DEFAULT_DIR_FILE_ARRAY = './' } = process.env;

const arr = [];

class FileArray {
  constructor(port, { dir = DEFAULT_DIR_FILE_ARRAY, override = false, data = [] } = {}) {
    this.port = port;

    // const isExist = fs.existsSync(path.join(dir, port));

    const isExist = false;

    if (!isExist || override) {
      kill(port, 'tcp').then(() => this._createServer(port));
    } else throw new Error(`array ${this.name} exist`);
  }

  _createServer(port) {
    const parse = {
      number: 1,
      object: 1,
      boolean: 1,
    };
    const returnValue = v => {
      const type = typeof v;
      if (parse[type]) return JSON.stringify(v);
      else if (typeof v === 'string') return v;
      else if (typeof v === 'undefined') return 'undefined';
    };

    const route = function (req, res) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });

      const { pathname, query: { data } = {} } = url.parse(req.url, true);
      console.log('data: ', data);
      console.log('pathname: ', pathname);

      switch (pathname) {
        case '/pop':
          res.end(returnValue(arr.pop()));
          break;
        case '/shift':
          res.end(returnValue(arr.shift()));
          break;
        case '/push':
          res.end(returnValue(arr.push(data)));
          break;
        case '/unshift':
          res.end(returnValue(arr.unshift(data)));
          break;
        default:
        // code block
      }
    };

    http.createServer(route).listen(port, err => {
      console.log('started to listen on ', port);
    });
  }

  destroy() {
    fs.rmdirSync(this.dir, { recursive: true });
    fs.mkdirSync(this.dir);
  }

  _write(file, data) {
    fs.writeFileSync(file, JSON.stringify(data));
  }

  _read(file) {
    return JSON.parse(fs.readFileSync(file));
  }

  async shift() {
    const release = await lockfile.lock(this.lockFile, this.options);

    const [first, ...rest] = this._read(this.queueFile);

    console.log('first, ...rest: ', first, rest);

    this._write(this.queueFile, rest);

    await release();

    return first;
  }

  async pop() {
    const release = await lockfile.lock(this.lockFile, this.options);

    const arr = this._read(this.queueFile);

    const last = arr.pop();

    this._write(this.queueFile, arr);

    await release();

    return last;
  }

  async push(data) {
    const release = await lockfile.lock(this.lockFile, this.options);

    this._write(this.queueFile, [...this._read(this.queueFile), data]);

    return release();
  }

  async unshift(data) {
    const release = await lockfile.lock(this.lockFile, this.options);

    this._write(this.queueFile, [data, ...this._read(this.queueFile)]);

    return release();
  }
}

new FileArray(8282);
