import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBudget, coverageMetrics, mutationMetrics, validateReports } from './metrics.mjs';
import { readFileSync } from 'node:fs';
const policy = JSON.parse(readFileSync(new URL('../quality.policy.json', import.meta.url)));
test('orçamento aceita o limite e rejeita um byte a mais', () => {
  assert.equal(evaluateBudget(policy.blocking.javascriptGzipBytes, policy.blocking.initialAssetBytes, policy).passed, true);
  assert.equal(evaluateBudget(policy.blocking.javascriptGzipBytes + 1, 0, policy).passed, false);
  assert.equal(evaluateBudget(0, policy.blocking.initialAssetBytes + 1, policy).passed, false);
});
const covered = (value) => ({ lines: { total: 100, covered: value }, branches: { total: 100, covered: value } });
test('cobertura não permite que uma área esconda falha em outra', () => {
  const summary = { '/src/domain/a.ts': covered(100), '/src/persistence/b.ts': covered(89) };
  assert.equal(coverageMetrics(summary, policy).passed, false);
  summary['/src/persistence/b.ts'] = covered(90);
  assert.equal(coverageMetrics(summary, policy).passed, true);
  assert.equal(coverageMetrics({}, policy).passed, false);
});
test('mutação calcula áreas separadas; sem mutantes é N/A, nunca 100%', () => {
  const report = { files: { 'src/domain/a.ts': { mutants: [{ status: 'Killed' }] }, 'src/persistence/b.ts': { mutants: [{ status: 'Survived' }] } } };
  assert.equal(mutationMetrics(report, policy).passed, false);
  report.files['src/persistence/b.ts'].mutants[0].status = 'Timeout';
  assert.equal(mutationMetrics(report, policy).passed, true);
  const empty = mutationMetrics({ files: {} }, policy);
  assert.equal(empty.areas.domain.score, null);
  assert.equal(empty.areas.domain.status, 'not-applicable');
  assert.equal(empty.passed, false);
});
test('gate rejeita relatório ausente, SHA errado, cancelado, pulado e check faltante', () => {
  const ci = { kind: 'ci', sha: 'abc', policyVersion: policy.version, status: 'passed', checks: ['typecheck','lint','architecture','unit','gate-tests','coverage','build','budget','e2e'].map(name => ({ name, passed: true })) };
  const mutation = { ...ci, kind: 'mutation', checks: [{ name: 'mutation', passed: true }, { name: 'mutation-metrics', passed: true }] };
  assert.equal(validateReports([ci, mutation], 'abc', policy), true);
  assert.equal(validateReports([ci], 'abc', policy), false);
  assert.equal(validateReports([ci, mutation], 'other', policy), false);
  for (const status of ['failed', 'cancelled', 'skipped']) assert.equal(validateReports([{ ...ci, status }, mutation], 'abc', policy), false);
  assert.equal(validateReports([{ ...ci, checks: [] }, mutation], 'abc', policy), false);
});
