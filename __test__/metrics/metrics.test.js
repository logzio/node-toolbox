const nodeMetrics = require('logzio-nodejs-metrics');
const { createMetricsSender } = require('../../metrics');

jest.mock('logzio-nodejs-metrics');
describe('metrics', () => {
  it('create metrics one with params', async () => {
    nodeMetrics.createMetrics = jest.fn().mockImplementation(({ token, host, bufferSize }) => {
      expect(token).toEqual('123');
      expect(host).toEqual('local');
      expect(bufferSize).toEqual(10);

      return {
        send: (data, meta) => {
          expect(data.name).toEqual('name');
          expect(meta.type).toEqual('holala');
          expect(meta.moreData).toEqual('moreData');
        },
      };
    });

    const metricsSender = await createMetricsSender({ token: '123', host: 'local', serviceName: 'holala' });

    metricsSender.sendMetrics({ data: { name: 'name' }, metaData: { moreData: 'moreData' } });
    expect(nodeMetrics.createMetrics).toHaveBeenCalled();
  });
});
