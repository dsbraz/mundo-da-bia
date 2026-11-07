import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { evaluateBudget } from './metrics.mjs';
export function measureBuild(directory) {
  let javascriptGzipBytes = 0;
  let initialAssetBytes = 0;
  for (const entry of readdirSync(directory, { recursive: true })) {
    const file = join(directory, entry);
    if (!statSync(file).isFile()) continue;
    const data = readFileSync(file);
    if (/\.(m?js)$/.test(entry)) javascriptGzipBytes += gzipSync(data).length;
    else initialAssetBytes += data.length;
  }
  return { javascriptGzipBytes, initialAssetBytes };
}
if (process.argv[1]?.endsWith('/budget.mjs')) {
  const policy = JSON.parse(readFileSync('quality.policy.json'));
  if (!statSync('dist/index.html').isFile()) throw new Error('Build ausente');
  const measured = measureBuild('dist');
  const report = evaluateBudget(measured.javascriptGzipBytes, measured.initialAssetBytes, policy);
  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/budget.json', JSON.stringify(report, null, 2));
  console.log(report);
  if (!report.passed) process.exitCode = 1;
}
