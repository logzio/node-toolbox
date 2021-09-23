import { Heap } from '../src/Heap.js';
import heapdump from 'heapdump';
jest.mock('heapdump');
describe.skip('metrics - Heap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.skip('should take snapshot if percentage incremental', async () => {
    const heap = new Heap({ minPercentage: 10, repeats: 4 });
    for (let i = 2; i <= 19; i++) {
      heap.check(i);
    }

    expect(heapdump.writeSnapshot).toHaveBeenCalledTimes(2);
  });

  it.skip('should take snapshot if percentage is max', async () => {
    const heap = new Heap({ minPercentage: 10, repeats: 4, maxPercentage: 20 });
    heap.check(20);
    for (let i = 2; i <= 9; i++) {
      heap.check(i);
    }

    heap.check(20);
    expect(heapdump.writeSnapshot).toHaveBeenCalledTimes(2);
  });
});
