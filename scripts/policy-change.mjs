import { execFileSync, spawnSync } from 'node:child_process';
const files = execFileSync('git', ['diff', '--name-only', process.env.BASE_SHA, process.env.HEAD_SHA], { encoding: 'utf8' }).trim().split('\n');
const existingPolicy = spawnSync('git', ['cat-file', '-e', `${process.env.BASE_SHA}:quality.policy.json`]).status === 0;
if (existingPolicy && files.includes('quality.policy.json')) {
  const allowed = /^(quality\.policy\.json|docs\/|README\.md|\.github\/pull_request_template\.md)/;
  if (files.some(file => !allowed.test(file))) throw new Error('Mudanças na política exigem PR dedicado, sem funcionalidade ou automação.');
  if (!files.some(file => file.startsWith('docs/policy-decisions/'))) throw new Error('Registre a justificativa em docs/policy-decisions/.');
}
