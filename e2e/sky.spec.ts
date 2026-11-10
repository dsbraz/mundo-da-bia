import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { point, ready } from './helpers';

async function street(page: Page) {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  town.location = { kind: 'street' };
  town.actors = town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: 250, y: 520 } : a);
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(town));
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await ready(page); await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  await expect(page.locator('canvas')).toHaveAttribute('data-street', 'true');
}
const sky = async (page: Page) => { const [cloud, crown, bird] = (await page.locator('canvas').getAttribute('data-sky'))!.split(','); return { cloud: Number(cloud), crown: Number(crown), bird: bird! }; };
/** The sky band above the facades' doors, across the visible street. */
async function skyBand(page: Page) {
  const world = (await page.locator('#world').boundingBox())!, top = await point(page, 500, 20), bottom = await point(page, 500, 200);
  return { x: world.x, y: Math.max(world.y, top.y), width: world.width, height: bottom.y - Math.max(world.y, top.y) };
}

test('em 20 s a rua mostra nuvens derivando, copas oscilando e um pássaro de passagem', async ({ page }) => {
  await street(page);
  await page.clock.runFor(100); const start = await sky(page);
  await page.screenshot({ path: 'reports/sky-street-0s.png' });
  let bird = false, widest = 0, shot = false;
  const middle = await page.locator('canvas').evaluate(c => Number(c.dataset.viewX) + Number(c.dataset.cameraX) + Number(c.dataset.viewWidth) / 2);
  for (let t = 0; t < 20000; t += 500) {
    await page.clock.runFor(500); const now = await sky(page);
    bird ||= now.bird !== '-'; widest = Math.max(widest, Math.abs(now.crown - start.crown));
    if (!shot && now.bird !== '-' && Math.abs(Number(now.bird) - middle) < 120) { await page.screenshot({ path: 'reports/sky-street-bird.png' }); shot = true; }
  }
  const end = await sky(page);
  await page.screenshot({ path: 'reports/sky-street-20s.png' });
  expect(Math.abs(end.cloud - start.cloud)).toBeGreaterThan(40);
  expect(widest).toBeGreaterThan(.01); expect(bird).toBe(true); expect(shot).toBe(true);
});

test('com movimento reduzido o céu da rua fica parado', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' }); await street(page);
  await page.clock.runFor(100);
  const band = await skyBand(page), before = await page.screenshot({ clip: band });
  await page.screenshot({ path: 'reports/sky-street-reduced.png' });
  for (let t = 0; t < 20000; t += 2000) { await page.clock.runFor(2000); expect(await sky(page)).toEqual({ cloud: 0, crown: 0, bird: '-' }); }
  expect((await page.screenshot({ clip: band })).equals(before)).toBe(true);
});
