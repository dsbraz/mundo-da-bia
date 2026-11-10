import { expect, test, type Page } from '@playwright/test';
import { readTown, ready } from './helpers';

const saveKey = 'mundo-da-bia:neighborhood:v2';
// Each case plays 20 to 45 s of scene time frame by frame (idle time counts real frames, never clock jumps), so it needs more than the default 30 s.
test.describe.configure({ timeout: 180000 });
async function still(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
/** Runs 30 s of a scene nobody touches, frame by frame, collecting the micro behaviours shown and a capture the first time each shows. */
async function watch(page: Page, prefix: string) {
  const seen = new Set<string>();
  for (let t = 0; t < 30000; t += 500) {
    await page.clock.runFor(500);
    for (const name of ((await page.locator('canvas').getAttribute('data-idle')) ?? '').split(' ').filter(Boolean)) {
      if (!seen.has(name)) await page.screenshot({ path: `reports/${prefix}-${name}.png` });
      seen.add(name);
    }
  }
  return seen;
}

test('30 s parado mostram pelo menos 3 micro comportamentos, um gato vai à peça favorita e nada muda no save', async ({ page }) => {
  await still(page);
  const before = await page.evaluate(key => localStorage.getItem(key), saveKey);
  const seen = await watch(page, 'idle');
  const micro = [...seen].filter(name => name !== 'blink');
  expect(micro.length, [...seen].join(' ')).toBeGreaterThanOrEqual(3);
  for (const name of ['breath', 'glance', 'tail', 'wander']) expect(seen, name).toContain(name);
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(before);
  const saved = await readTown(page); await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  expect(await readTown(page)).toEqual(saved);
});

test('um toque manda o gato de volta e zera o ócio', async ({ page }) => {
  await still(page);
  await expect.poll(async () => { await page.clock.runFor(500); return page.locator('canvas').getAttribute('data-idle'); }, { timeout: 120000 }).toContain('wander');
  await page.clock.runFor(1500); await page.screenshot({ path: 'reports/idle-wander-walking.png' });
  await page.locator('#tray-toggle').click();
  await expect.poll(async () => { await page.clock.runFor(500); return page.locator('canvas').getAttribute('data-idle'); }, { timeout: 60000 }).not.toContain('wander');
  await page.clock.runFor(15000); expect(await page.locator('canvas').getAttribute('data-idle')).not.toContain('wander');
});

test('com movimento reduzido, em 30 s parado só há piscadas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await still(page);
  const before = await page.evaluate(key => localStorage.getItem(key), saveKey);
  expect([...await watch(page, 'idle-reduced')]).toEqual(['blink']);
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(before);
});
