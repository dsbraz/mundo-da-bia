import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan, tests } from './e2e-shards.mjs';
test('os testes do relatório viram arquivo › describe › título, com execuções e a mais lenta', () => {
  const spec = (title, durations) => ({ title, tests: [{ results: durations.map(duration => ({ duration })) }] });
  const report = { suites: [{ file: 'a.spec.ts', specs: [spec('um', [5])], suites: [{ title: 'grupo', specs: [spec('dois', [3, 9])] }] }] };
  assert.deepEqual(tests(report), [{ id: 'a.spec.ts › um', runs: 1, ms: 5 }, { id: 'a.spec.ts › grupo › dois', runs: 2, ms: 9 }]);
});
test('o plano põe cada teste em um shard e equilibra as durações; teste novo vale a mediana', () => {
  const shards = plan(['a', 'b', 'c', 'd', 'novo'], { a: 10, b: 6, c: 4, d: 1 }, 2);
  assert.deepEqual(shards, [['a', 'c'], ['b', 'd', 'novo']]);
});
