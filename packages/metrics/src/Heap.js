import { Monitor } from '@madvinking/utils';
import { join } from 'path';
import heapdump from 'heapdump';
import v8 from 'v8';

function _isIncremental(arr) {
  let incremental = true;
  for (let index = 1; index < arr.length; index += 1) {
    if (arr[index - 1] > arr[index]) {
      incremental = false;
      break;
    }
  }

  return incremental;
}

export class Heap extends Monitor {
  #memHistory;
  #snapshotFolder;
  #minPercentage;
  #maxPercentage;
  #repeats;
  #onSnapshot;
  constructor({ snapshotFolder = '/var/local/', minPercentage = 40, maxPercentage = 97, repeats = 3, onSnapshot, interval } = {}) {
    super(interval);
    this.#memHistory = [];
    this.#snapshotFolder = snapshotFolder;
    this.#minPercentage = minPercentage;
    this.#maxPercentage = maxPercentage;
    this.#repeats = repeats;
    this.#onSnapshot = onSnapshot;
  }

  takeSnapshot(heapPercentage = 0, onSnapshot = this.#onSnapshot) {
    const name = `${join(this.#snapshotFolder, Date.now().toString())}.heapsnapshot`;
    heapdump.writeSnapshot(name, () => onSnapshot && onSnapshot(name, heapPercentage));
  }
  get() {
    const { heap_size_limit, total_heap_size } = v8.getHeapStatistics();
    const percentage = (total_heap_size * 100) / heap_size_limit;
    return percentage;
  }

  monitor() {
    const invoke = () => this.check(this.get());
    this.start(invoke);
  }

  check(heapPercentage) {
    if (heapPercentage < this.#minPercentage) {
      this.#memHistory.length = 0;
      return;
    }

    this.#memHistory.push(heapPercentage);

    if (this.#memHistory.some(m => m >= this.#maxPercentage)) {
      this.takeSnapshot(heapPercentage);
      this.#memHistory.length = 0;
    } else if (this.#repeats === this.#memHistory.length) {
      const incremental = _isIncremental(this.#memHistory);
      if (incremental) this.takeSnapshot(heapPercentage);
      this.#memHistory.length = 0;
    }
  }
}
