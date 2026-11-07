import { defineConfig } from '@playwright/test';
import policy from './quality.policy.json' with { type: 'json' };
export default defineConfig({
  testDir: './e2e', retries: policy.blocking.retries, forbidOnly: true,
  reporter: [['list'], ['json', { outputFile: 'reports/e2e.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1024, height: 768 }, hasTouch: true, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
