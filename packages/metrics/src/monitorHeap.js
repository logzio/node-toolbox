import { join } from 'path';
import heapdump from 'heapdump';

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

export function monitorHeap({
  snapshotFolder = '/var/local/',
  minPercentage = 40,
  maxPercentage = 97,
  repeats = 3,
  onSnapshotTaken,
} = {}) {
  const memHistory = [];

  function _takeSnapShot(heapPercentage = 0) {
    const name = `${join(snapshotFolder, Date.now().toString())}.heapsnapshot`;
    heapdump.writeSnapshot(name, () => onSnapshotTaken && onSnapshotTaken(name, heapPercentage));
  }

  return function checkHeap(heapPercentage) {
    if (heapPercentage < minPercentage) {
      memHistory.length = 0;
      return;
    }

    memHistory.push(heapPercentage);

    if (memHistory.some(m => m >= maxPercentage)) {
      _takeSnapShot(heapPercentage);
      memHistory.length = 0;
    } else if (repeats === memHistory.length) {
      const incremental = _isIncremental(memHistory);
      if (incremental) _takeSnapShot(heapPercentage);
      memHistory.length = 0;
    }
  };
}
