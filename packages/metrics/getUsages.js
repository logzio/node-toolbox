const v8 = require('v8');
const { cpu, drive, mem } = require('node-os-utils');

async function getUsages() {
  const [cpuPercentage, { freePercentage }, { freeMemPercentage }] = await Promise.all([
    cpu.usage(),
    drive.info(),
    mem.info(),
  ]);
  const { heap_size_limit, used_heap_size } = v8.getHeapStatistics();
  const heapPercentage = (used_heap_size * 100) / heap_size_limit;

  const metricsData = {
    cpuPercentage,
    heapPercentage,
    drivePercentage: +freePercentage,
    memPercentage: freeMemPercentage,
  };

  return metricsData;
}

module.exports = {
  getUsages,
};
