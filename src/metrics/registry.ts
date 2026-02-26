import { Gauge, Registry } from 'prom-client';

export const createMetricsRegistry = (): Registry => {
  const registry = new Registry();

  const applicationUpGauge = new Gauge({
    name: 'shan_api_up',
    help: 'Static process liveness gauge for shan-api',
    registers: [registry],
  });

  applicationUpGauge.set(1);

  return registry;
};
