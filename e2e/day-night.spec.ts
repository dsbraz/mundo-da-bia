import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { point, read, readTown, ready } from './helpers';
import { contrast, luminance, pixels, playMinutes } from './session';

const shots = 'reports/wave3-life-2';
const night = (page: Page) => page.locator('canvas').getAttribute('data-night');
async function street(page: Page) {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  town.location = { kind: 'street' };
  town.actors = town.actors.map(a => a.id === 'bia' ? { ...a, location: { kind: 'street' }, x: 250, y: 520 } : a);
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(town));
}
/** Mean luminance of the backdrop band near the top of the room or street. */
async function backdrop(page: Page) {
  const a = await point(page, 300, 120), b = await point(page, 700, 160);
  const all = await pixels(page, { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y });
  return all.reduce((sum, c) => sum + luminance(c), 0) / all.length;
}
/** The contrast of Bia's face: her eyes (darkest) against her skin (the bright end of the face). */
async function faceContrast(page: Page) {
  const bia = (await read(page)).actors.find(a => a.id === 'bia')!;
  const a = await point(page, bia.x - 26, bia.y - 150), b = await point(page, bia.x + 26, bia.y - 108);
  const face = (await pixels(page, { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y })).sort((p, q) => luminance(p) - luminance(q));
  return contrast(face[0]!, face[Math.floor(face.length * .9)]!);
}

test('aos 12 min de Brincar a sala está escura, o rosto da Bia segue legível (AA) e o save não guarda a fase', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
  await ready(page);
  expect(await night(page)).toMatch(/^manha:0\.00:/);
  await page.screenshot({ path: `${shots}/day-room-1024.png` });
  const day = await backdrop(page), before = await readTown(page);
  await playMinutes(page, 12);
  await page.clock.runFor(1500);
  expect(await night(page)).toMatch(/^noite:/);
  await page.screenshot({ path: `${shots}/night-room-1024.png` });
  expect(await backdrop(page)).toBeLessThan(day * .8);
  expect(await faceContrast(page)).toBeGreaterThanOrEqual(4.5);
  const after = await readTown(page);
  expect(JSON.stringify(after)).not.toMatch(/noite|entardecer|"phase"/);
  expect(after.buildings).toEqual(before.buildings);
  await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(300);
  await page.screenshot({ path: `${shots}/night-room-844.png` });
  expect(await faceContrast(page)).toBeGreaterThanOrEqual(4.5);
});

for (const reduced of [false, true]) test(`à noite a rua tem lua, estrelas${reduced ? ' paradas (movimento reduzido)' : ' piscando'} e janelas acesas`, async ({ page }) => {
  test.setTimeout(90_000);
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await street(page);
  await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
  await ready(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-street', 'true');
  await playMinutes(page, 12);
  await page.clock.runFor(reduced ? 200 : 1500);
  expect(await night(page)).toMatch(reduced ? /^noite:0\.50:still$/ : /^noite:0\.50:twinkle$/);
  const suffix = reduced ? '-reduced' : '';
  await page.screenshot({ path: `${shots}/night-street-1024${suffix}.png` });
  await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(300);
  await page.screenshot({ path: `${shots}/night-street-844${suffix}.png` });
  expect(await faceContrast(page)).toBeGreaterThanOrEqual(4.5);
});
