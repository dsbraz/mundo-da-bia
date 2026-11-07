import { readFileSync } from 'node:fs';
const policy = JSON.parse(readFileSync(new URL('./quality.policy.json', import.meta.url)));
export default {
  mutate: ['src/domain/**/*.ts', 'src/persistence/**/*.ts', '!src/**/*.test.ts', '!src/domain/types.ts'],
  testRunner: 'vitest', vitest: { configFile: 'vitest.config.ts' },
  coverageAnalysis: 'perTest', reporters: ['clear-text', 'json', 'html'],
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  thresholds: { high: policy.blocking.mutation, low: policy.blocking.mutation, break: policy.blocking.mutation },
};
