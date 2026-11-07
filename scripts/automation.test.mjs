import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const policy = JSON.parse(readFileSync('quality.policy.json'));
const eslint = new ESLint();
async function errors(source, filePath = 'src/domain/probe.ts') {
  return (await eslint.lintText(source, { filePath }))[0].messages.filter(m => m.severity === 2);
}
test('ESLint rejeita complexidade excedida e aceita função simples', async () => {
  const bad = `export function probe(x: number) { ${Array.from({ length: policy.blocking.complexity }, (_, i) => `if (x === ${i}) return ${i};`).join('\n')} return -1; }`;
  assert.ok((await errors(bad)).some(e => e.ruleId === 'complexity'));
  assert.equal((await errors('export function probe(x: number) { return x + 1; }')).length, 0);
});
test('ESLint restringe navegador e armazenamento', async () => {
  assert.ok((await errors('export const bad = window;')).some(e => e.ruleId === 'no-restricted-globals'));
  assert.ok((await errors("export const bad = globalThis['localStorage'];", 'src/presentation/probe.ts')).some(e => e.ruleId === 'no-restricted-syntax'));
  assert.ok((await errors('export const bad = localStorage;', 'src/presentation/probe.ts')).some(e => e.ruleId === 'no-restricted-syntax'));
});
test('dependency-cruiser rejeita import proibido e ciclos por alias, aceita domínio puro', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bia-architecture-'));
  const binary = resolve('node_modules/.bin/depcruise');
  const config = require('../.dependency-cruiser.cjs');
  mkdirSync(join(dir, 'src/domain'), { recursive: true });
  mkdirSync(join(dir, 'src/presentation'), { recursive: true });
  writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@/*': ['src/*'] } } }));
  writeFileSync(join(dir, '.dependency-cruiser.cjs'), `module.exports = ${JSON.stringify(config)}`);
  const run = () => {
    const result = spawnSync(binary, ['src', '--config', '.dependency-cruiser.cjs', '--output-type', 'json'], { cwd: dir, encoding: 'utf8' });
    if (result.error) throw result.error;
    return JSON.parse(result.stdout).summary.violations;
  };
  try {
    writeFileSync(join(dir, 'src/domain/a.ts'), 'export const value = 1;');
    assert.deepEqual(run(), []);
    writeFileSync(join(dir, 'src/presentation/b.ts'), 'export const view = 2;');
    writeFileSync(join(dir, 'src/domain/a.ts'), "export { view } from '../presentation/b';");
    assert.ok(run().some(v => v.rule.name === 'pure-domain'));
    writeFileSync(join(dir, 'src/domain/a.ts'), "export { b } from '@/domain/b'; export const a = 1;");
    writeFileSync(join(dir, 'src/domain/b.ts'), "export { a } from '@/domain/a'; export const b = 2;");
    assert.ok(run().some(v => v.rule.name === 'no-cycles'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
