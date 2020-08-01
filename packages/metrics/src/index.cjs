'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var utils = require('@logzio-node-toolbox/utils');
var v8 = _interopDefault(require('v8'));
var osUtils = _interopDefault(require('node-os-utils'));
var path = require('path');
var heapdump = _interopDefault(require('heapdump'));

const { cpu, drive, mem, netstat } = osUtils;

async function getUsages() {
  const [cpuPercentage, cpuFree, { freePercentage }, memory, network] = await Promise.all([
    cpu.usage(),
    cpu.free(),
    drive.info(),
    mem.info(),
    netstat.inOut(),
  ]);

  const { heap_size_limit, used_heap_size, total_heap_size } = v8.getHeapStatistics();

  const metricsData = {
    cpu: {
      percentage: cpuPercentage,
      free: cpuFree,
    },
    heap: {
      percentage: (total_heap_size * 100) / heap_size_limit,
      size: used_heap_size,
      totalSize: total_heap_size,
      sizeLimit: heap_size_limit,
    },
    memory: {
      total: memory.totalMemMb,
      used: memory.usedMemMb,
      free: memory.freeMemMb,
      percentage: memory.freeMemPercentage,
    },
    drive: {
      percentage: +freePercentage,
    },
    network,
  };

  return metricsData;
}

class Metrics extends utils.Monitor {
  #metaData;

  constructor({ metaData = {}, ...MonitorOptions } = {}) {
    super(MonitorOptions);
    this.#metaData = metaData;
  }

  async get({ metrics, metaData } = {}) {
    const currentUsage = await getUsages();

    return {
      metrics: {
        ...currentUsage,
        ...metrics,
      },
      metaData: {
        ...this.#metaData,
        ...metaData,
      },
    };
  }

  monitor(interval) {
    this.start({ monitor: this.get, interval });
  }
}

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
class Heap extends utils.Monitor {
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
    const name = `${path.join(this.#snapshotFolder, Date.now().toString())}.heapsnapshot`;
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

exports.Heap = Heap;
exports.Metrics = Metrics;
exports.getUsages = getUsages;
