import { readFileSync } from 'node:fs';
const policy = JSON.parse(readFileSync(new URL('./quality.policy.json', import.meta.url)));
export default {
  mutate: ['src/domain/**/*.ts', 'src/persistence/**/*.ts', '!src/**/*.test.ts', '!src/domain/types.ts'],
  testRunner: 'vitest', vitest: { configFile: 'vitest.config.ts' },
  coverageAnalysis: 'perTest', reporters: ['clear-text', 'json', 'html'],
  jsonReporter: { fileName: 'reports/mutation/mutation.json' },
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  // A CI shard scores only part of the mutants: the merged report is what the gate holds to the limit (mutation-metrics).
  thresholds: { high: policy.blocking.mutation, low: policy.blocking.mutation, break: process.env.MUTATION_SHARD ? null : policy.blocking.mutation },
};
