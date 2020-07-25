import { Monitor } from '../src/Monitor.js';

describe.skip('utils - Monitor', () => {
  it('invoke callback function on monitor', async () => {
    let numberOfCalls = 0;

    const monitor = new Monitor({ monitor: async () => (numberOfCalls += 1), interval: 5 });
    monitor.start();
    jest.runAllTimers();

    expect(numberOfCalls).toEqual(2);
  });
});
