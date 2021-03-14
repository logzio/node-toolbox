import { Consul } from './Consul.js';

const consul = new Consul({ port: 18500 });
console.log('consul: ', consul);

async function init() {
  consul.watch({
    key: 'test.json',
    onChange: data => {
      console.log('got data', data);
    },
    onError: err => {
      console.log('got err', err);
    },
  });
}

init();
