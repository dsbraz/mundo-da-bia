import ts from 'typescript-eslint';
import { readFileSync } from 'node:fs';
const policy = JSON.parse(readFileSync(new URL('./quality.policy.json', import.meta.url)));
const limits = policy.blocking;
export default ts.config(
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'reports/**', '.stryker-tmp/**'] },
  ...ts.configs.recommended,
  { files: ['src/**/*.ts'], rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    complexity: ['error', limits.complexity],
    'max-depth': ['error', limits.depth],
    'max-lines-per-function': ['error', { max: limits.functionLines, skipBlankLines: true, skipComments: true }],
    'max-lines': ['error', { max: limits.fileLines, skipBlankLines: true, skipComments: true }],
  } },
  { files: ['src/**/*.ts'], ignores: ['src/persistence/storage.ts', '**/*.test.ts'], rules: {
    'no-restricted-syntax': ['error', { selector: "Identifier[name='localStorage'], Literal[value='localStorage']", message: 'localStorage pertence ao adaptador de persistência.' }],
  } },
  { files: ['src/domain/**/*.ts'], ignores: ['**/*.test.ts'], rules: {
    'no-restricted-globals': ['error', 'window', 'document', 'navigator', 'localStorage', 'fetch', 'globalThis'],
  } },
  { files: ['src/content/**/*.ts', '**/*.test.ts'], rules: {
    'max-lines': 'off', 'max-lines-per-function': 'off',
  } },
);
