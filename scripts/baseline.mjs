import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
try {
  const run = execFileSync('gh', ['run', 'list', '--workflow', 'quality.yml', '--branch', 'main', '--status', 'success', '--limit', '1', '--json', 'databaseId', '--jq', '.[0].databaseId'], { encoding: 'utf8' }).trim();
  if (!/^\d+$/.test(run)) throw new Error('Nenhuma execução válida de main.');
  rmSync('reports/baseline', { recursive: true, force: true });
  execFileSync('gh', ['run', 'download', run, '--name', 'quality-ci', '--dir', 'reports/baseline']);
  // Do not recursively retain older baseline artifacts.
  rmSync('reports/baseline/baseline', { recursive: true, force: true });
} catch (error) { console.warn(`Baseline indisponível (alerta): ${error.message}`); }
