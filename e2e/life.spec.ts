import { expect, test, type Page } from '@playwright/test';
import { point, readTown, ready } from './helpers';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { actors } from '../src/content/catalog';

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
  const idle = async () => (await page.locator('canvas').getAttribute('data-idle')) ?? '';
  // Scene time only, bounded: the stroll starts once 20 s pass without a touch.
  await advance(page, 20000);
  for (let t = 0; t < 5000 && !(await idle()).includes('wander'); t += 500) await advance(page, 500);
  expect(await idle()).toContain('wander');
  await advance(page, 1500); await page.screenshot({ path: 'reports/idle-wander-walking.png' });
  await page.locator('#tray-toggle').click();
  // A fixed 10 s of scene time covers the walk home from anywhere in the room.
  await advance(page, 10000);
  expect(await idle()).not.toContain('wander');
});

test('com movimento reduzido, em 30 s parado só há piscadas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await still(page);
  const before = await page.evaluate(key => localStorage.getItem(key), saveKey);
  expect([...await watch(page, 'idle-reduced')]).toEqual(['blink']);
  expect(await page.evaluate(key => localStorage.getItem(key), saveKey)).toBe(before);
});

/** Height and width, in screen px, of the pixels painted in a cat's own fur colour around its feet at (x, y). */
async function silhouette(page: Page, id: 'mimi' | 'nino', x: number, y: number) {
  const a = await point(page, x - 80, y - 150), b = await point(page, x + 80, y + 10);
  const shot = await page.screenshot({ clip: { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y } });
  return page.evaluate(async ({ png, fur }) => {
    const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const g = canvas.getContext('2d')!; g.drawImage(image, 0, 0); const d = g.getImageData(0, 0, canvas.width, canvas.height).data;
    const rgb = [fur >> 16, (fur >> 8) & 255, fur & 255], rows: number[] = [], columns: number[] = [];
    for (let row = 0; row < canvas.height; row++) for (let column = 0; column < canvas.width; column++) {
      const i = (row * canvas.width + column) * 4;
      if (rgb.every((v, k) => Math.abs(d[i + k]! - v) <= 14)) { rows.push(row); columns.push(column); }
    }
    return { height: Math.max(...rows) - Math.min(...rows), width: Math.max(...columns) - Math.min(...columns) };
  }, { png: shot.toString('base64'), fur: actors[id].skin });
}

for (const reduced of [false, true]) test(`gato descansando fica enrolado: deitado, bem mais baixo que sentado${reduced ? ' (movimento reduzido: pose parada)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const world = initialWorld();
  const spots: Record<string, number> = { bia: 100, luna: 170, leo: 880, rui: 930, mimi: 480, nino: 680, pipoca: 800 };
  world.actors = world.actors.map(a => ({ ...a, x: spots[a.id]!, y: a.kind === 'cat' ? 540 : 530, seat: null, resting: a.id === 'mimi' }));
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await still(page);
  // Any key dismisses the ghost hand of the first opening, so nothing covers the cats.
  await page.keyboard.press('Shift'); await advance(page, 1000);
  await expect(page.locator('#first-touch')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveAttribute('data-idle', /curl/);
  const at = await point(page, 380, 420), end = await point(page, 580, 560);
  await page.screenshot({ path: `reports/idle-cat-curl${reduced ? '-reduced' : ''}.png`, clip: { x: at.x, y: at.y, width: end.x - at.x, height: end.y - at.y } });
  const curled = await silhouette(page, 'mimi', 480, 540), sitting = await silhouette(page, 'nino', 680, 540);
  expect(curled.height, JSON.stringify({ curled, sitting })).toBeLessThan(sitting.height * .6);
  expect(curled.width).toBeGreaterThan(curled.height * 1.5);
  // With reduced motion the curled pose stands still.
  if (reduced) { await advance(page, 3000); expect(await silhouette(page, 'mimi', 480, 540)).toEqual(curled); }
});
