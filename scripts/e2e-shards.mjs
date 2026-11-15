// Splits the e2e tests into CI shards of similar duration, using the durations of the last run (Playwright's own
// --shard splits by test count, so a few slow tests together hold one shard back). Each shard runs its list with
// --test-list; `check` makes sure the shards ran one plan that covers every test exactly once.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const durationsFile = 'reports/e2e-durations.json', listFile = 'reports/e2e-shard.txt';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
/** Every test of a Playwright JSON report as `file › describe › title`, with its runs and slowest run in ms. */
export function tests(report) {
  const found = [];
  const walk = (suite, path) => {
    for (const spec of suite.specs ?? []) {
      const runs = spec.tests.flatMap(test => test.results.map(result => result.duration));
      found.push({ id: [...path, spec.title].join(' › '), runs: runs.length, ms: Math.max(0, ...runs) });
    }
    for (const child of suite.suites ?? []) walk(child, [...path, child.title]);
  };
  for (const file of report.suites) walk(file, [file.file]);
  return found;
}
/** Greedy split, slowest first; tests the last run did not have count as its median. */
export function plan(ids, durations, total) {
  const known = Object.values(durations).sort((a, b) => a - b);
  const fallback = known[Math.floor(known.length / 2)] ?? 1;
  const shards = Array.from({ length: total }, () => ({ load: 0, ids: [] }));
  const weighted = ids.map(id => ({ id, ms: durations[id] ?? fallback })).sort((a, b) => b.ms - a.ms || a.id.localeCompare(b.id));
  for (const { id, ms } of weighted) {
    const lightest = shards.reduce((min, shard) => shard.load < min.load ? shard : min);
    lightest.load += ms; lightest.ids.push(id);
  }
  return shards.map(shard => shard.ids.sort());
}
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function shard(index, total) {
  if (!(index >= 1 && index <= total)) throw new Error('E2E_SHARD deve ser i/n');
  const listed = execFileSync('npx', ['--no-install', 'playwright', 'test', '--list', '--reporter=json'], { encoding: 'utf8', maxBuffer: 1 << 28 });
  const ids = tests(JSON.parse(listed)).map(test => test.id);
  const all = plan(ids, existsSync(durationsFile) ? read(durationsFile) : {}, total), mine = all[index - 1];
  if (!mine.length) throw new Error(`Shard ${index} sem testes`);
  mkdirSync('reports', { recursive: true });
  writeFileSync(listFile, `${mine.join('\n')}\n`);
  // The workflow copies it beside the blob report (merge-reports reads only its .zip files) so the ci job can check the shards.
  writeFileSync(`reports/e2e-plan-${index}.json`, JSON.stringify({ index, total, planHash: hash(all), tests: mine.length, all: ids.length }));
  console.log(`Shard ${index}/${total}: ${mine.length} de ${ids.length} testes`);
}
/** After merge-reports: one plan, every shard present, and each planned test ran exactly once. */
function check(blobDir, reportFile) {
  const plans = readdirSync(blobDir).filter(name => /^e2e-plan-\d+\.json$/.test(name)).map(name => read(join(blobDir, name)));
  const [first] = plans, ran = tests(read(reportFile));
  const onePlan = plans.length > 0 && plans.length === first.total && new Set(plans.map(p => p.index)).size === first.total
    && plans.every(p => p.planHash === first.planHash);
  const onceEach = ran.length === first?.all && new Set(ran.map(test => test.id)).size === ran.length && ran.every(test => test.runs === 1);
  const problems = [onePlan ? '' : 'faltam shards ou há planos diferentes', onceEach ? '' : 'nem todo teste planejado rodou uma vez'].filter(Boolean);
  if (problems.length) throw new Error(`Shards de e2e: ${problems.join('; ')}`);
  console.log(`Shards de e2e: ${first.total} shards, ${ran.length} testes, cada um uma vez.`);
}
function durations(reportFile) {
  writeFileSync(durationsFile, JSON.stringify(Object.fromEntries(tests(read(reportFile)).map(test => [test.id, test.ms]))));
}
if (process.argv[1]?.endsWith('/e2e-shards.mjs')) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'shard') shard(...(process.env.E2E_SHARD ?? '').split('/').map(Number));
  else if (command === 'check') check(...args);
  else if (command === 'durations') durations(...args);
  else throw new Error('Uso: e2e-shards.mjs shard|check <blob> <e2e.json>|durations <e2e.json>');
}
