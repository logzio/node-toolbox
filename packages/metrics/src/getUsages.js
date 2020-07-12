import v8 from 'v8';
import { default as osUtils } from 'node-os-utils';

const { cpu, drive, mem, netstat } = osUtils;

export async function getUsages() {
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
