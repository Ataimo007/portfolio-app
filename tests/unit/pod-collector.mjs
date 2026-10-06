import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectPods, podExpressions } from '../../workers/telemetry.mjs';
const now = 1700000000000;
const sample = (value, metric = {}, age = 0) => ({ metric: { namespace: 'app', pod: 'portfolio-one', ...metric }, value: [now / 1000 - age, String(value)] });
test('partial source failure preserves inventory and withholds absent resource values', async () => {
  const values = [[sample(1, { phase: 'Running' })], [sample(12.5)], null, [sample(1)], [sample(2)]];
  const pods = await collectPods(async expression => { const data = values[podExpressions.indexOf(expression)]; if (data === null) throw Error('offline'); return data; }, now);
  assert.deepEqual(pods, [{ name: 'portfolio-one', namespace: 'app', phase: 'Running', cpuMillicores: 12.5, memoryBytes: null, ready: true, restarts: 2 }]);
});
test('rejects stale samples, invalid names and nonfinite or negative measurements', async () => {
  const values = [[sample(1, { phase: 'Running' }), sample(1, { pod: undefined }), sample(1, { pod: 'stale-pod' }, 121)], [sample('NaN')], [sample(-1)], [sample(0)], [sample(1.5)]];
  const pods = await collectPods(async expression => values[podExpressions.indexOf(expression)], now);
  assert.equal(pods.length, 1);
  assert.equal(pods[0].cpuMillicores, null);
  assert.equal(pods[0].memoryBytes, null);
  assert.equal(pods[0].ready, false);
  assert.equal(pods[0].restarts, null);
});
test('distinguishes empty inventory from failed collection', async () => {
  assert.deepEqual(await collectPods(async () => [], now), []);
  assert.equal(await collectPods(async () => { throw Error('offline'); }, now), null);
});
