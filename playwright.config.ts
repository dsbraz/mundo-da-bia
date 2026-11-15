import { defineConfig } from '@playwright/test';
import policy from './quality.policy.json' with { type: 'json' };
// A page load fetches ~1500 files (~900 in a build): 5-8 s on a busy CI runner, so a test with two loads, drags and real-time waits can
// pass 30 s without hanging. Expectations keep their own timeouts; only the whole-test budget is 60 s.
export default defineConfig({
  testDir: './e2e', timeout: 60_000, retries: policy.blocking.retries, forbidOnly: true,
  reporter: [['list'], ['json', { outputFile: 'reports/e2e.json' }]],
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 1024, height: 768 }, hasTouch: true, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: false },
});
