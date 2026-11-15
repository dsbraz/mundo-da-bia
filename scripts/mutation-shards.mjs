// Splits the Stryker run into CI shards and merges their reports back into one, so the gate scores exactly the
// mutants a single run would. A shard mutates whole top-level statements (`file:a-b` line ranges): Stryker only
// mutates nodes contained in a range, and no mutant spans two top-level statements, so none is lost or doubled.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, globSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, matchesGlob } from 'node:path';
import ts from 'typescript';
import config from '../stryker.config.mjs';
const cacheFile = 'reports/stryker-incremental.json', shardFile = 'reports/mutation-shard.json';
const mutationFile = 'reports/mutation/mutation.json';
const inShard = path => path.replace(/^reports\//, '');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
export function mutateFiles(patterns) {
  const include = patterns.filter(p => !p.startsWith('!')), exclude = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1));
  return [...new Set(include.flatMap(p => globSync(p)))].filter(file => !exclude.some(p => matchesGlob(file, p))).sort();
}
/** Top-level statements as line ranges; statements sharing a line stay in one unit. */
export function units(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest);
  const line = position => tree.getLineAndCharacterOfPosition(position).line + 1;
  const found = [];
  for (const statement of tree.statements) {
    const unit = { file, start: line(statement.getStart(tree)), end: line(statement.end) }, last = found.at(-1);
    if (last && unit.start <= last.end) last.end = Math.max(last.end, unit.end); else found.push(unit);
  }
  return found;
}
const inside = (range, location) => location.start.line >= range.start && location.end.line <= range.end;
/** Estimated cost from the last report: a static mutant runs every test, the others their covering tests plus overhead. */
function weigh(unit, cached, tests, factor) {
  if (!cached) return (unit.end - unit.start + 1) * 40;
  const cost = cached.mutants.filter(m => inside(unit, m.location)).reduce((sum, m) => sum + (m.static ? tests : (m.coveredBy?.length ?? 0) + 20), 1);
  return cost * factor;
}
/** Splits every mutated file into `total` shards of similar estimated cost (greedy, heaviest unit first). */
export function plan(files, total, cache, force) {
  const tests = Object.values(cache?.testFiles ?? {}).reduce((sum, file) => sum + file.tests.length, 0);
  const weighted = files.flatMap(({ file, source }) => {
    const cached = cache?.files[file];
    // When reusing results, unchanged files mostly reuse them too: they weigh less than the changed ones.
    const factor = force || cached?.source !== source ? 1 : .1;
    return units(file, source).map(unit => ({ ...unit, weight: weigh(unit, cached, tests, factor) }));
  });
  const shards = Array.from({ length: total }, () => ({ load: 0, units: [] }));
  for (const unit of weighted.sort((a, b) => b.weight - a.weight || a.file.localeCompare(b.file) || a.start - b.start)) {
    const lightest = shards.reduce((min, shard) => shard.load < min.load ? shard : min);
    lightest.load += unit.weight; lightest.units.push(unit);
  }
  return shards.map(shard => shard.units.sort((a, b) => a.file.localeCompare(b.file) || a.start - b.start)
    .map(({ file, start, end }) => ({ file, start, end })));
}
export const pattern = ({ file, start, end }) => `${file}:${start}-${end}`;
const testKey = (name, test) => `${name}@${test.location?.start.line}:${test.location?.start.column}\n${test.name}`;
const mutantKey = (name, m) => `${name}@${m.location.start.line}:${m.location.start.column}-${m.location.end.line}:${m.location.end.column}\n${m.mutatorName}: ${m.replacement}`;
/** One id per test across shards: every shard runs all tests, but numbers them in its own order. */
function mergeTests(shards) {
  const ids = new Map(), testFiles = {};
  for (const [name, file] of shards.flatMap(({ report }) => Object.entries(report.testFiles ?? {}))) {
    testFiles[name] ??= { ...file, tests: [] };
    const fresh = file.tests.filter(test => !ids.has(testKey(name, test)));
    for (const test of fresh) ids.set(testKey(name, test), String(ids.size));
    testFiles[name].tests.push(...fresh.map(test => ({ ...test, id: ids.get(testKey(name, test)) })));
  }
  return { ids, testFiles };
}
/** Merges shard reports, keeping from each shard only the mutants of its own ranges (Stryker's incremental mode
 *  also echoes old results for the rest) with ids that stay unique across shards. */
export function merge(shards) {
  const { ids, testFiles } = mergeTests(shards), files = {};
  for (const { report, ranges } of shards) {
    const local = new Map(Object.entries(report.testFiles ?? {}).flatMap(([name, file]) => file.tests.map(test => [test.id, ids.get(testKey(name, test))])));
    const renumber = list => list?.map(id => local.get(id));
    for (const [name, file] of Object.entries(report.files)) {
      const mine = ranges.filter(range => range.file === name.replaceAll('\\', '/'));
      const mutants = file.mutants.filter(m => mine.some(range => inside(range, m.location)))
        .map(m => ({ ...m, id: mutantKey(name, m), coveredBy: renumber(m.coveredBy), killedBy: renumber(m.killedBy) }));
      if (mutants.length) (files[name] ??= { ...file, mutants: [] }).mutants.push(...mutants);
    }
  }
  return { ...shards[0].report, files, testFiles };
}
function runShard() {
  const [index, total] = (process.env.MUTATION_SHARD ?? '').split('/').map(Number);
  if (!(index >= 1 && index <= total)) throw new Error('MUTATION_SHARD deve ser i/n');
  const files = mutateFiles(config.mutate).map(file => ({ file, source: readFileSync(file, 'utf8') }));
  const force = process.env.STRYKER_INCREMENTAL === 'force';
  const all = plan(files, total, existsSync(cacheFile) ? read(cacheFile) : null, force);
  const ranges = all[index - 1];
  if (!ranges.length) throw new Error(`Shard ${index} sem mutantes`);
  const planHash = createHash('sha256').update(JSON.stringify(all)).digest('hex');
  const flags = { reuse: ['--incremental'], force: ['--incremental', '--force'] }[process.env.STRYKER_INCREMENTAL] ?? [];
  const result = spawnSync('npx', ['--no-install', 'stryker', 'run', ...flags, '--mutate', ranges.map(pattern).join(',')], { stdio: 'inherit' });
  writeFileSync(shardFile, JSON.stringify({ index, total, planHash, ranges, exitCode: result.status }, null, 2));
  process.exitCode = result.status === 0 ? 0 : 1;
}
/** Reads `reports/shards/<artifact>/` (one per shard, holding what the shard wrote under reports/) and writes the merged reports. */
function mergeShards() {
  const shards = readdirSync('reports/shards').map(dir => join('reports/shards', dir)).map(dir => ({
    ...read(join(dir, inShard(shardFile))), report: read(join(dir, inShard(mutationFile))), cache: read(join(dir, inShard(cacheFile))),
  }));
  const total = shards[0]?.total;
  const complete = shards.length === total && new Set(shards.map(s => s.index)).size === total;
  if (!complete || shards.some(s => s.planHash !== shards[0].planHash || s.total !== total)) throw new Error('Shards de mutação incompletos ou de planos diferentes');
  if (shards.some(s => s.exitCode !== 0)) throw new Error('Um shard de mutação falhou');
  mkdirSync('reports/mutation', { recursive: true });
  writeFileSync(mutationFile, JSON.stringify(merge(shards)));
  writeFileSync(cacheFile, JSON.stringify(merge(shards.map(s => ({ ranges: s.ranges, report: s.cache })))));
}
if (process.argv[1]?.endsWith('/mutation-shards.mjs')) {
  if (process.argv[2] === 'run') runShard();
  else if (process.argv[2] === 'merge') mergeShards();
  else throw new Error('Uso: mutation-shards.mjs run|merge');
}
