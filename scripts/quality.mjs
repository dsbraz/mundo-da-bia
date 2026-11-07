import { spawnSync, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { coverageMetrics, mutationMetrics } from './metrics.mjs';
const policy = JSON.parse(readFileSync('quality.policy.json'));
const mode = process.argv[2];
if (!['fast', 'ci', 'mutation', 'all'].includes(mode)) throw new Error('Modo inválido');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
mkdirSync('reports', { recursive: true });
const fast = [
  ['typecheck', 'npm', 'run', 'typecheck'], ['lint', 'npm', 'run', 'lint'],
  ['architecture', 'npm', 'run', 'architecture'], ['unit', 'npm', 'test'],
];
const ci = [...fast, ['gate-tests', 'npm', 'run', 'test:gates'], ['coverage', 'npm', 'run', 'coverage'],
  ['build', 'npm', 'run', 'build'], ['budget', 'npm', 'run', 'budget'], ['e2e', 'npm', 'run', 'e2e']];
function read(path) { return JSON.parse(readFileSync(path)); }
function run(kind, commands) {
  const started = Date.now();
  const report = { kind, sha, dirty: execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0, policyVersion: policy.version, limits: policy.blocking, checks: [], metrics: {}, warnings: [], status: 'failed' };
  rmSync(`reports/${kind}.json`, { force: true });
  if (kind === 'ci') for (const path of ['coverage', 'dist', 'reports/e2e.json', 'reports/budget.json']) rmSync(path, { recursive: true, force: true });
  if (kind === 'mutation') rmSync('reports/mutation', { recursive: true, force: true });
  for (const [name, command, ...args] of commands) {
    const time = Date.now();
    const result = spawnSync(command, args, { stdio: 'inherit' });
    const check = { name, passed: result.status === 0, seconds: (Date.now() - time) / 1000, exitCode: result.status, error: result.error?.message };
    try {
      if (name === 'coverage') { report.metrics.coverage = coverageMetrics(read('coverage/coverage-summary.json'), policy); check.passed &&= report.metrics.coverage.passed; }
      if (name === 'budget') report.metrics.budget = read('reports/budget.json');
      if (name === 'e2e') { const results = read('reports/e2e.json'); check.passed &&= results.stats.flaky === 0 && results.stats.skipped === 0 && results.stats.expected > 0; }
    } catch (error) { check.passed = false; check.error = error.message; }
    report.checks.push(check);
  }
  if (kind === 'mutation') {
    try { report.metrics.mutation = mutationMetrics(read('reports/mutation/mutation.json'), policy); report.checks.push({ name: 'mutation-metrics', passed: report.metrics.mutation.passed }); }
    catch (error) { report.checks.push({ name: 'mutation-metrics', passed: false, error: error.message }); }
  }
  report.seconds = (Date.now() - started) / 1000;
  if (kind === 'ci' && report.seconds > policy.warnings.ciSeconds) report.warnings.push('CI acima da meta de duração.');
  compareBaseline(report);
  report.status = report.checks.every(check => check.passed) ? 'passed' : 'failed';
  writeFileSync(`reports/${kind}.json`, JSON.stringify(report, null, 2));
  const summary = `# Qualidade: ${kind}\n\nSHA: ${sha}${report.dirty ? ' (workspace com alterações)' : ''}\nPolítica: ${policy.version}\nResultado: ${report.status}\n\n${report.checks.map(check => `- ${check.passed ? 'PASS' : 'FAIL'} ${check.name}${check.error ? `: ${check.error}` : ''}`).join('\n')}\n\nLimites: ${JSON.stringify(policy.blocking)}\n\nMétricas:\n\n\`\`\`json\n${JSON.stringify(report.metrics, null, 2)}\n\`\`\`\n${report.warnings.join('\n')}\n`;
  writeFileSync(`reports/${kind}.md`, summary);
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
if (mode === 'fast') run('fast', fast);
if (['ci', 'all'].includes(mode)) run('ci', ci);
if (['mutation', 'all'].includes(mode)) run('mutation', [['mutation', 'npx', '--no-install', 'stryker', 'run']]);
