import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { plazaBall } from '../src/domain/outdoor';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { closeTray, drag, point, ready, tray } from './helpers';
import { playMinutes } from './session';

const shots = 'reports/wave3-life-2';
const face = async (page: Page, id: string) => Object.fromEntries((await page.locator('canvas').getAttribute('data-faces'))!.split(' ').map(f => f.split(':')))[id];

/** W3L-13: Rui on the street with the plaza ball at 320, 525; the clock installed first. */
async function ruiOnStreet(page: Page) {
  const town = plazaBall(migrateNeighborhood(initialAlbum(initialWorld())));
  town.location = { kind: 'street' };
  town.actors = town.actors.map(a => a.id === 'rui' ? { ...a, location: { kind: 'street' }, x: 150, y: 525, seat: null } : a);
  town.items = town.items.map(i => i.kind === 'bola' ? { ...i, location: { kind: 'street' }, x: 320, y: 525, holder: null, spot: 'floor' } : i);
  await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); }, encodeNeighborhood(town));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-12T10:00:30'));
}
/** Flicks the ball to the right, 20 px per 16 ms frame (as in ball.spec). */
async function flick(page: Page) {
  const path = [];
  for (let x = 420; x >= 320; x -= 20) path.unshift(await point(page, x, 508));
  await page.mouse.move(path[0]!.x, path[0]!.y); await page.mouse.down();
  for (const p of path.slice(1)) { await page.clock.runFor(16); await page.mouse.move(p.x, p.y); }
  await page.mouse.up();
}

for (const reduced of [false, true]) test(`o Rui com a bola (a favorita): quando ela para, o rosto dele fica feliz${reduced ? ' (movimento reduzido)' : ''}`, async ({ page }) => {
  test.setTimeout(90_000);
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await ruiOnStreet(page);
  await tray(page); await page.locator('#cast [data-actor=rui]').click(); await closeTray(page);
  // Hunger in `pede` after 4 min: no longer the happy face of the morning.
  await playMinutes(page, 4);
  await expect.poll(() => face(page, 'rui')).not.toBe('happy');
  await flick(page);
  for (let t = 0; t < 6000 && await face(page, 'rui') !== 'happy'; t += 100) await page.clock.runFor(100);
  expect(await face(page, 'rui')).toBe('happy');
  await page.setViewportSize({ width: 844, height: 390 }); await page.clock.runFor(200);
  await page.screenshot({ path: `${shots}/rui-ball-happy-844${reduced ? '-reduced' : ''}.png` });
});

test('Léo solto sobre o Rui: toca-aqui em vez de abraço (W3L-14)', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-12T10:00:00') });
  await page.addInitScript(() => localStorage.setItem('mundo-da-bia:autonomy', 'off'));
  await ready(page); await page.clock.pauseAt(new Date('2026-11-12T10:00:30'));
  await drag(page, [420, 450], [830, 450]);
  await expect(page.locator('canvas')).toHaveAttribute('data-hug', 'leo:rui:five');
  await page.clock.runFor(300);
  await page.screenshot({ path: `${shots}/high-five-leo-rui-1024.png` });
});

test('o interruptor de adulto em Organizar desliga a autonomia e lembra a escolha (W3L-13)', async ({ page }) => {
  await ready(page);
  await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  const toggle = page.locator('#autonomy-toggle');
  await expect(toggle).toBeChecked();
  await toggle.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/autonomy-switch-1024.png` });
  await toggle.uncheck();
  expect(await page.evaluate(() => localStorage.getItem('mundo-da-bia:autonomy'))).toBe('off');
  await page.reload(); await expect(page.locator('canvas')).toHaveAttribute('data-ready', 'true');
  await page.locator('#map-toggle').click(); await page.getByRole('button', { name: 'Organizar', exact: true }).click();
  await expect(page.locator('#autonomy-toggle')).not.toBeChecked();
});
