import { test } from 'node:test';
import assert from 'node:assert/strict';
import { merge, pattern, plan, units } from './mutation-shards.mjs';
const source = 'import { x } from "./x";\nexport const a = 1; export const b = [\n  2,\n];\n\nexport function c() {\n  return a;\n}\n';
test('cada instrução de topo é uma unidade; as que dividem uma linha ficam juntas', () => {
  assert.deepEqual(units('f.ts', source).map(pattern), ['f.ts:1-1', 'f.ts:2-4', 'f.ts:6-8']);
});
test('o plano reparte todas as unidades entre os shards, uma vez cada, e equilibra o custo estimado', () => {
  const at = (line, extra = {}) => ({ static: false, coveredBy: ['0'], location: { start: { line, column: 0 }, end: { line, column: 1 } }, ...extra });
  const cache = { testFiles: { 't.ts': { tests: Array.from({ length: 100 }, (_, id) => ({ id: String(id) })) } },
    files: { 'f.ts': { source, mutants: [at(2, { static: true }), at(7)] } } };
  const shards = plan([{ file: 'f.ts', source }, { file: 'g.ts', source: 'export const g = 1;\n' }], 2, cache, true);
  assert.deepEqual(shards.flat().map(pattern).sort(), ['f.ts:1-1', 'f.ts:2-4', 'f.ts:6-8', 'g.ts:1-1']);
  assert.deepEqual(shards.map(shard => shard.map(pattern)), [['f.ts:2-4'], ['f.ts:1-1', 'f.ts:6-8', 'g.ts:1-1']]);
});
test('a fusão fica só com os mutantes das faixas de cada shard e renumera os testes', () => {
  const mutant = (line, status, killedBy) => ({ mutatorName: 'M', replacement: 'r', status, killedBy, coveredBy: killedBy, location: { start: { line, column: 0 }, end: { line, column: 1 } } });
  const tests = order => ({ 't.ts': { tests: order.map((name, id) => ({ id: String(id), name, location: { start: { line: 1, column: 0 } } })) } });
  const one = { files: { 'f.ts': { source, mutants: [mutant(2, 'Killed', ['0']), mutant(7, 'Survived', [])] } }, testFiles: tests(['a', 'b']) };
  const two = { files: { 'f.ts': { source, mutants: [mutant(2, 'Survived', []), mutant(7, 'Killed', ['0'])] } }, testFiles: tests(['b', 'a']) };
  const merged = merge([{ report: one, ranges: [{ file: 'f.ts', start: 1, end: 4 }] }, { report: two, ranges: [{ file: 'f.ts', start: 6, end: 8 }] }]);
  assert.deepEqual(merged.files['f.ts'].mutants.map(m => [m.location.start.line, m.status, m.killedBy]), [[2, 'Killed', ['0']], [7, 'Killed', ['1']]]);
  assert.deepEqual(merged.testFiles['t.ts'].tests.map(t => [t.id, t.name]), [['0', 'a'], ['1', 'b']]);
  assert.equal(new Set(merged.files['f.ts'].mutants.map(m => m.id)).size, 2);
});
