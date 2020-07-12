import heapdump from 'heapdump';
import { monitorHeap } from '../src/monitorHeap.js';
jest.mock('heapdump');
describe('metrics - monitorHeap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should take snapshot if percentage incremental', async () => {
    const monitor = monitorHeap({ minPercentage: 10, repeats: 4 });
    for (let i = 2; i <= 19; i++) {
      monitor(i);
    }

    expect(heapdump.writeSnapshot).toHaveBeenCalledTimes(2);
  });

  it('should take snapshot if percentage is max', async () => {
    const monitor = monitorHeap({ minPercentage: 10, repeats: 4, maxPercentage: 20 });

    for (let i = 2; i <= 9; i++) {
      monitor(i);
    }

    monitor(20);
    expect(heapdump.writeSnapshot).toHaveBeenCalledTimes(1);
  });
});
