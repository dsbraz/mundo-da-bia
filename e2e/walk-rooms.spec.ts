import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { closeTray, playUntil as play, point, points, readTown, tap, tray } from './helpers';

const canvas = (page: Page) => page.locator('canvas');
const shots = 'reports/review';
test.describe.configure({ timeout: 90_000 });
/** Plays scene time in 50 ms frames until the canvas attribute reads `value`. */
const playUntil = (page: Page, name: string, value: string) => play(page, () => canvas(page).getAttribute(name), value);
const room = async (page: Page) => { const where = (await readTown(page)).location; return where.kind === 'interior' ? where.room : 'street'; };
const bia = async (page: Page) => (await readTown(page)).actors.find(a => a.id === 'bia')!;
/** Opens the game on a paused clock, optionally in a house with one more floor (its first room is `room-3`). */
async function open(page: Page, viewport: { width: number; height: number }, { upstairs = false, reduced = false, paused = true } = {}) {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  if (upstairs) {
    const town = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'add-floor', building: 1 });
    await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v2')) localStorage.setItem('mundo-da-bia:neighborhood:v2', value); }, encodeNeighborhood(town));
  }
  if (paused) await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.setViewportSize(viewport); await page.goto('/');
  await expect(canvas(page)).toHaveAttribute('data-ready', 'true');
  if (paused) await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
}
/** Taps `at` and plays until the chosen character has walked there, gone through and the room is `to`. */
async function walkThrough(page: Page, at: [number, number], to: string, door = 'enter') {
  const from = await room(page);
  await tap(page, ...at);
  expect(await room(page)).toBe(from);
  await playUntil(page, 'data-door', door);
  await play(page, () => room(page), to);
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  test(`lote 8A: tocar na beirada do chão leva a Bia andando para fora do cômodo e ela entra andando pela beirada do lado, e só ela (${viewport.width})`, async ({ page }) => {
    await open(page, viewport);
    const before = await readTown(page);
    await walkThrough(page, [1170, 500], 'quarto', 'edge');
    const after = await readTown(page);
    // She comes in from the bedroom's left edge, the one that leads back, and walks to 150.
    expect(after.actors.find(a => a.id === 'bia')).toMatchObject({ location: after.location, x: 150, y: 500 });
    expect(after.actors.filter(a => a.id !== 'bia')).toEqual(before.actors.filter(a => a.id !== 'bia'));
    await playUntil(page, 'data-strolling', ''); await page.clock.runFor(800);
    await page.screenshot({ path: `${shots}/walk-rooms-arrive-${viewport.width}.png` });
    // And back the same way.
    await walkThrough(page, [30, 500], 'sala', 'edge');
    expect(await bia(page)).toMatchObject({ x: 1050, y: 500 });
  });
  test(`a escada leva a Bia ao andar de cima e de volta (${viewport.width})`, async ({ page }) => {
    await open(page, viewport, { upstairs: true });
    await point(page, 120, 300);
    await page.screenshot({ path: `${shots}/walk-rooms-stairs-up-${viewport.width}.png` });
    await walkThrough(page, [120, 300], 'room-3');
    expect(await bia(page)).toMatchObject({ x: 262, y: 520 });
    await playUntil(page, 'data-strolling', '');
    await page.screenshot({ path: `${shots}/walk-rooms-stairs-down-${viewport.width}.png` });
    await walkThrough(page, [120, 560], 'sala');
    expect(await bia(page)).toMatchObject({ x: 228, y: 480 });
  });
}
test('lote 8A: arrastar a Bia com um objeto até a beirada do chão leva as duas coisas ao cômodo do lado', async ({ page }) => {
  await open(page, { width: 1024, height: 768 }, { paused: false });
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Ursinho', exact: true }).click(); await closeTray(page);
  await expect.poll(async () => (await readTown(page)).items.find(i => i.id === '1:ursinho')!.holder).toBe('bia');
  // Held by the chest, 90 above the feet: the feet land on the floor's right edge.
  const actor = await bia(page), [a, b] = await points(page, [[actor.x, actor.y - 90], [1170, 410]]);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 });
  await expect(canvas(page)).toHaveAttribute('data-door-glow', 'true');
  await page.screenshot({ path: `${shots}/walk-rooms-drag-1024.png` });
  await page.mouse.up();
  await expect(canvas(page)).toHaveAttribute('data-drop-outcome', 'crossed');
  await expect.poll(async () => (await readTown(page)).location).toEqual({ kind: 'interior', building: 1, room: 'quarto' });
  const town = await readTown(page);
  expect(town.location).toEqual({ kind: 'interior', building: 1, room: 'quarto' });
  expect(town.actors.find(a => a.id === 'bia')!.location).toEqual(town.location);
  expect(town.items.find(i => i.id === '1:ursinho')).toMatchObject({ holder: 'bia', location: town.location });
});
test('lote 8A: com movimento reduzido, a beirada do chão ainda leva ao cômodo ao lado', async ({ page }) => {
  await open(page, { width: 1024, height: 768 }, { reduced: true });
  await walkThrough(page, [1170, 500], 'quarto', 'edge');
  expect(await bia(page)).toMatchObject({ x: 150, y: 500 });
});
