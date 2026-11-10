import { expect, test, type Page } from '@playwright/test';
import { point, readTown, ready } from './helpers';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';

const saveKey = 'mundo-da-bia:neighborhood:v2';
/** Plays `ms` of scene time as 100 ms frames: idle time counts frame steps up to 100 ms (never bigger clock jumps), with few frames to render. */
async function advance(page: Page, ms: number) { for (let t = 0; t < ms; t += 100) await page.clock.fastForward(100); }
async function still(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.setViewportSize({ width: 1280, height: 800 }); await ready(page);
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
/** Runs 30 s of a scene nobody touches, frame by frame, collecting the micro behaviours shown and a capture the first time each shows. */
async function watch(page: Page, prefix: string) {
  const seen = new Set<string>();
  for (let t = 0; t < 30000; t += 500) {
    await advance(page, 500);
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
  await advance(page, 20000);
  await expect.poll(async () => { await advance(page, 500); return page.locator('canvas').getAttribute('data-idle'); }).toContain('wander');
  await advance(page, 1500); await page.screenshot({ path: 'reports/idle-wander-walking.png' });
  await page.locator('#tray-toggle').click();
  await expect.poll(async () => { await advance(page, 500); return page.locator('canvas').getAttribute('data-idle'); }).not.toContain('wander');
});

test('com movimento reduzido, em 30 s parado só há piscadas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await still(page);
  const before = await page.evaluate(key => localStorage.getItem(key), saveKey);
  expect([...await watch(page, 'idle-reduced')]).toEqual(['blink']);
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(before);
});

for (const reduced of [false, true]) test(`gato descansando fica enrolado, com a cauda deitada${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const world = initialWorld(); world.actors = world.actors.map(a => a.id === 'mimi' ? { ...a, resting: true, seat: null, x: 520, y: 540 } : a);
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await still(page);
  await expect.poll(async () => { await page.clock.runFor(100); return page.locator('canvas').getAttribute('data-idle'); }).toContain('curl');
  const mimi = await point(page, 520, 540), at = await point(page, 440, 440);
  await page.screenshot({ path: `reports/idle-cat-curl${reduced ? '-reduced' : ''}.png`, clip: { x: at.x, y: at.y, width: (mimi.x - at.x) * 2, height: (mimi.y - at.y) * 1.3 } });
});
