import { Monitor } from '@logzio-node-toolbox/utils';
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
  #memHistory = [];
  #snapshotFolder;
  #minPercentage;
  #maxPercentage;
  #repeats;
  #onSnapshot;
  constructor({
    snapshotFolder = '/var/local/',
    minPercentage = 40,
    maxPercentage = 97,
    repeats = 3,
    onSnapshot,
    ...MonitorOptions
  } = {}) {
    super(MonitorOptions);
    this.#snapshotFolder = snapshotFolder;
    this.#minPercentage = minPercentage;
    this.#maxPercentage = maxPercentage;
    this.#onSnapshot = onSnapshot;
    this.#repeats = repeats;
  }

  _takeSnapshot(heapPercentage = 0, onSnapshot = this.#onSnapshot) {
    const name = `${join(this.#snapshotFolder, Date.now().toString())}.heapsnapshot`;
    heapdump.writeSnapshot(name, () => onSnapshot && onSnapshot(name, heapPercentage));
  }
  get() {
    const { heap_size_limit, total_heap_size } = v8.getHeapStatistics();
    const percentage = (total_heap_size * 100) / heap_size_limit;
    return percentage;
  }

  monitor(internval) {
    const invoke = () => this.check(this.get());
    this.start({ monitor: invoke.bind(this), internval });
  }

  dump(onSnapshot = this.#onSnapshot) {
    this._takeSnapshot(this.get(), onSnapshot);
  }

  check(heapPercentage) {
    if (heapPercentage < this.#minPercentage) {
      this.#memHistory.length = 0;
      return heapPercentage;
    }

    this.#memHistory.push(heapPercentage);

    if (this.#memHistory.some(m => m >= this.#maxPercentage)) {
      this._takeSnapshot(heapPercentage);
      this.#memHistory.length = 0;
    } else if (this.#repeats === this.#memHistory.length) {
      const incremental = _isIncremental(this.#memHistory);
      if (incremental) this._takeSnapshot(heapPercentage);
      this.#memHistory.length = 0;
    }
    return heapPercentage;
  }
}
