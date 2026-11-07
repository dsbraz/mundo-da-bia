import { defineConfig } from 'vitest/config';
import policy from './quality.policy.json' with { type: 'json' };
export default defineConfig({ test: { include: ['src/**/*.test.ts'], retry: policy.blocking.retries, coverage: { provider: 'v8', include: ['src/domain/**/*.ts', 'src/persistence/**/*.ts'], exclude: ['**/*.test.ts', '**/types.ts'], reporter: ['text', 'json-summary'], thresholds: { 'src/domain/**': policy.blocking.coverage, 'src/persistence/**': policy.blocking.coverage } } } });
