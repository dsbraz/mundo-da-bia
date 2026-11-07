import { readFileSync } from 'node:fs';
import { validateReports } from './metrics.mjs';
const policy = JSON.parse(readFileSync('quality.policy.json'));
try {
  const reports = ['ci', 'mutation'].map(kind => JSON.parse(readFileSync(`reports/${kind}.json`)));
  if (!validateReports(reports, process.env.GITHUB_SHA, policy) || reports.some(r => r.dirty)) throw new Error('Relatórios não aprovam este commit limpo.');
  console.log(`quality-gate aprovado: ${process.env.GITHUB_SHA}`);
} catch (error) { console.error(`quality-gate reprovado: ${error.message}`); process.exitCode = 1; }
