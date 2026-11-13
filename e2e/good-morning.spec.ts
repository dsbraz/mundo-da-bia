import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { closeTray, readTown, ready, tray } from './helpers';
import { playMinutes } from './session';

// Lot 6B: the "bom dia" after sleeping through the night is legible (opaque while it is read) and stands above the selected one's name
// tag and star, never on them, nor under the action ring, also on a small screen.
const actor = async (page: Page, id: string) => (await readTown(page)).actors.find(a => a.id === id)!;
async function press(page: Page, name: string) {
  await tray(page); await page.locator('#cast [data-actor=bia]').click(); await closeTray(page);
  const button = page.getByRole('button', { name, exact: true });
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Mais ações', exact: true }).click();
  await button.click();
}
/** The speech bubble's box (`data-said-box`, scene units) in screen pixels. */
async function saidBox(page: Page) {
  return page.locator('canvas').evaluate(c => {
    const [x, y, w, h] = c.dataset.saidBox!.split(',').map(Number) as [number, number, number, number], box = c.getBoundingClientRect(), s = box.width / Number(c.dataset.viewWidth);
    const at = (px: number, py: number) => ({ x: box.x + (px - Number(c.dataset.viewX) - Number(c.dataset.cameraX)) * s, y: box.y + (py - Number(c.dataset.viewY)) * s });
    const a = at(x, y), b = at(x + w, y + h);
    return { left: a.x, top: a.y, right: b.x, bottom: b.y };
  });
}
const apart = (a: { left: number; top: number; right: number; bottom: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.right <= b.x || a.left >= b.x + b.width || a.bottom <= b.y || a.top >= b.y + b.height;

test('o bom-dia é legível e fica acima do nome e da estrela da Bia, sem cobrir o anel, a 1024, 1280 e 844', async ({ page }) => {
  test.setTimeout(180_000);
  const world = initialWorld();
  world.actors = world.actors.map(a => a.id === 'bia' ? { ...a, room: 'quarto', x: 400, y: 520 } : a.id === 'leo' ? { ...a, room: 'quarto', x: 250, y: 530 } : a);
  world.room = 'quarto';
  await page.clock.install({ time: new Date('2026-11-13T10:00:00') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-13T10:01:30'));
  await playMinutes(page, 12);
  await page.clock.runFor(1500);
  await press(page, 'Deitar');
  for (let t = 0; t < 15_000 && !(await actor(page, 'bia')).resting; t += 100) await page.clock.runFor(100);
  for (let t = 0; t < 4000 && !(await page.locator('canvas').getAttribute('data-night'))!.startsWith('manha'); t += 100) await page.clock.runFor(100);
  await expect(page.locator('canvas')).toHaveAttribute('data-reaction', 'bia:Bom dia! Já é de manhã.');
  // Mid-read: the line is still there, opaque, above the tag.
  await page.clock.runFor(1200);
  const bia = await actor(page, 'bia');
  for (const [width, height] of [[1024, 768], [1280, 800], [844, 390]] as const) {
    await page.setViewportSize({ width, height }); await page.clock.runFor(50);
    const [said, star] = [await saidBox(page), await page.locator('canvas').evaluate((c, top) => {
      const box = c.getBoundingClientRect(), s = box.width / Number(c.dataset.viewWidth);
      return box.y + (top - Number(c.dataset.viewY)) * s;
    }, bia.y - 220 * .86 - 44 - 14)];
    await page.screenshot({ path: `reports/review/lot6b-good-morning-${width}.png` });
    expect(said.bottom, `${width}`).toBeLessThanOrEqual(star + 1);
    const ring = await page.locator('#actor-context').boundingBox();
    if (ring && await page.locator('#actor-context').isVisible()) expect(apart(said, ring), `${width}`).toBe(true);
  }
});
