import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execute = promisify(execFile);
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { coverageMetrics, mutationMetrics } from './metrics.mjs';
const policy = JSON.parse(readFileSync('quality.policy.json'));
const mode = process.argv[2];
if (!['fast', 'ci', 'ci-checks', 'ci-merge', 'mutation', 'all'].includes(mode)) throw new Error('Modo inválido');
const sha = (await execute('git', ['rev-parse', 'HEAD'])).stdout.trim();
mkdirSync('reports', { recursive: true });
const fast = [
  ['typecheck', 'npm', 'run', 'typecheck'], ['lint', 'npm', 'run', 'lint'],
  ['architecture', 'npm', 'run', 'architecture'], ['unit', 'npm', 'test'],
];
const ci = [...fast, ['gate-tests', 'npm', 'run', 'test:gates'], ['coverage', 'npm', 'run', 'coverage'],
  ['build', 'npm', 'run', 'build'], ['budget', 'npm', 'run', 'budget'], ['e2e', 'npm', 'run', 'e2e']];
// CI splits `ci` in two: every check but e2e runs beside the sharded e2e jobs (ci-checks),
// then ci-merge folds the merged shard results in as the e2e check and writes reports/ci.json.
const ciChecks = ci.filter(([name]) => name !== 'e2e');
const e2eMerge = [['e2e', 'npx', '--no-install', 'playwright', 'merge-reports', '--reporter', 'json', 'reports/blob']];
const mutationArgs = { reuse: ['--incremental'], force: ['--incremental', '--force'] }[process.env.STRYKER_INCREMENTAL] ?? [];
function read(path) { return JSON.parse(readFileSync(path)); }
async function run(kind, commands, { file = kind, base } = {}) {
  const started = Date.now();
  const fresh = { kind, sha, dirty: (await execute('git', ['status', '--porcelain'])).stdout.trim().length > 0, policyVersion: policy.version, limits: policy.blocking, checks: [], metrics: {}, warnings: [], status: 'failed' };
  const report = base ? { ...base, checks: [...base.checks], dirty: fresh.dirty || base.dirty, status: 'failed' } : fresh;
  if (base && base.sha !== sha) report.checks.push({ name: 'same-sha', passed: false, error: `ci-checks é de ${base.sha}` });
  rmSync(`reports/${file}.json`, { force: true });
  if (kind === 'ci' && !base) for (const path of ['coverage', 'dist', 'reports/e2e.json', 'reports/budget.json']) rmSync(path, { recursive: true, force: true });
  if (kind === 'mutation') rmSync('reports/mutation', { recursive: true, force: true });
  for (const [name, command, ...args] of commands) {
    const time = Date.now();
    const result = await new Promise(resolve => {
      const child = spawn(command, args, { stdio: 'inherit' });
      child.on('error', error => resolve({ status: null, error }));
      child.on('close', status => resolve({ status }));
    });
    const check = { name, passed: result.status === 0 && !result.error, seconds: (Date.now() - time) / 1000, exitCode: result.status, error: result.error?.message };
    try {
      if (name === 'coverage') { report.metrics.coverage = coverageMetrics(read('coverage/coverage-summary.json'), policy); check.passed &&= report.metrics.coverage.passed; }
      if (name === 'budget') report.metrics.budget = read('reports/budget.json');
      if (name === 'e2e') { const results = read('reports/e2e.json'); check.passed &&= results.stats.flaky === 0 && (results.stats.unexpected ?? 0) === 0 && results.stats.skipped === 0 && results.stats.expected > 0; }
    } catch (error) { check.passed = false; check.error = error.message; }
    report.checks.push(check);
  }
  if (kind === 'mutation') {
    try { report.metrics.mutation = mutationMetrics(read('reports/mutation/mutation.json'), policy); report.checks.push({ name: 'mutation-metrics', passed: report.metrics.mutation.passed }); }
    catch (error) { report.checks.push({ name: 'mutation-metrics', passed: false, error: error.message }); }
  }
  report.seconds = (base?.seconds ?? 0) + (Date.now() - started) / 1000;
  if (kind === 'ci' && report.seconds > policy.warnings.ciSeconds && !report.warnings.includes('CI acima da meta de duração.')) report.warnings.push('CI acima da meta de duração.');
  if (!base) compareBaseline(report);
  report.status = report.checks.every(check => check.passed) ? 'passed' : 'failed';
  writeFileSync(`reports/${file}.json`, JSON.stringify(report, null, 2));
  const summary = `# Qualidade: ${kind}\n\nSHA: ${sha}${report.dirty ? ' (workspace com alterações)' : ''}\nPolítica: ${policy.version}\nResultado: ${report.status}\n\n${report.checks.map(check => `- ${check.passed ? 'PASS' : 'FAIL'} ${check.name}${check.error ? `: ${check.error}` : ''}`).join('\n')}\n\nLimites: ${JSON.stringify(policy.blocking)}\n\nMétricas:\n\n\`\`\`json\n${JSON.stringify(report.metrics, null, 2)}\n\`\`\`\n${report.warnings.join('\n')}\n`;
  writeFileSync(`reports/${file}.md`, summary);
  console.log(summary);
  if (report.status !== 'passed') process.exitCode = 1;
}
function compareBaseline(report) {
  const path = 'reports/baseline/ci.json';
  if (!existsSync(path)) { report.warnings.push('Baseline válida de main indisponível.'); return; }
  const baseline = read(path);
  if (baseline.status !== 'passed' || baseline.policyVersion !== policy.version) { report.warnings.push('Baseline incompatível.'); return; }
  const oldSize = baseline.metrics?.budget?.javascriptGzipBytes;
  const newSize = report.metrics.budget?.javascriptGzipBytes;
  if (oldSize && newSize) {
    report.metrics.buildGrowthPercent = (newSize / oldSize - 1) * 100;
    if (report.metrics.buildGrowthPercent > policy.warnings.buildGrowthPercent) report.warnings.push('Crescimento do build acima da meta.');
  }
}
if (mode === 'fast') await run('fast', fast);
if (['ci', 'all'].includes(mode)) await run('ci', ci);
if (mode === 'ci-checks') await run('ci', ciChecks, { file: 'ci-checks' });
if (mode === 'ci-merge') await run('ci', e2eMerge, { base: read('reports/ci-checks.json') });
if (['mutation', 'all'].includes(mode)) await run('mutation', [['mutation', 'npx', '--no-install', 'stryker', 'run', ...mutationArgs]]);
