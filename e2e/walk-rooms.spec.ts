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
async function walkThrough(page: Page, at: [number, number], to: string) {
  const from = await room(page);
  await tap(page, ...at);
  expect(await room(page)).toBe(from);
  await playUntil(page, 'data-door', 'enter');
  await play(page, () => room(page), to);
}

for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }]) {
  test(`tocar na porta do fim da parede leva a Bia andando ao cômodo ao lado, e só ela (${viewport.width})`, async ({ page }) => {
    await open(page, viewport);
    const before = await readTown(page);
    await page.screenshot({ path: `${shots}/walk-rooms-door-${viewport.width}.png` });
    await walkThrough(page, [1132, 300], 'quarto');
    const after = await readTown(page);
    // She comes out of the bedroom's doorway on its left, the one that leads back.
    expect(after.actors.find(a => a.id === 'bia')).toMatchObject({ location: after.location, x: 68, y: 480 });
    expect(after.actors.filter(a => a.id !== 'bia')).toEqual(before.actors.filter(a => a.id !== 'bia'));
    await playUntil(page, 'data-strolling', ''); await page.clock.runFor(800);
    await page.screenshot({ path: `${shots}/walk-rooms-arrive-${viewport.width}.png` });
    // And back the same way.
    await walkThrough(page, [68, 300], 'sala');
    expect(await bia(page)).toMatchObject({ x: 1132, y: 480 });
  });
  test(`a escada leva a Bia ao andar de cima e de volta (${viewport.width})`, async ({ page }) => {
    await open(page, viewport, { upstairs: true });
    await point(page, 101, 300);
    await page.screenshot({ path: `${shots}/walk-rooms-stairs-up-${viewport.width}.png` });
    await walkThrough(page, [101, 300], 'room-3');
    expect(await bia(page)).toMatchObject({ x: 145, y: 505 });
    await playUntil(page, 'data-strolling', '');
    await page.screenshot({ path: `${shots}/walk-rooms-stairs-down-${viewport.width}.png` });
    await walkThrough(page, [210, 585], 'sala');
    expect(await bia(page)).toMatchObject({ x: 101, y: 480 });
  });
}
test('arrastar a Bia com um objeto até a porta atravessa as duas coisas', async ({ page }) => {
  await open(page, { width: 1024, height: 768 }, { paused: false });
  await tray(page, 'Objetos'); await page.getByRole('button', { name: 'Ursinho', exact: true }).click(); await closeTray(page);
  await expect.poll(async () => (await readTown(page)).items.find(i => i.id === '1:ursinho')!.holder).toBe('bia');
  // Held by the chest, 90 above the feet: the feet land on the doorway's sill (its left part, so she and the doorway fit in one view).
  const actor = await bia(page), [a, b] = await points(page, [[actor.x, actor.y - 90], [1090, 330]]);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 });
  await expect(canvas(page)).toHaveAttribute('data-door-glow', 'true');
  await page.screenshot({ path: `${shots}/walk-rooms-drag-1024.png` });
  await page.mouse.up();
  await expect(canvas(page)).toHaveAttribute('data-drop-outcome', 'crossed');
  const town = await readTown(page);
  expect(town.location).toEqual({ kind: 'interior', building: 1, room: 'quarto' });
  expect(town.actors.find(a => a.id === 'bia')!.location).toEqual(town.location);
  expect(town.items.find(i => i.id === '1:ursinho')).toMatchObject({ holder: 'bia', location: town.location });
});
test('com movimento reduzido, a porta do fim da parede ainda leva ao cômodo ao lado', async ({ page }) => {
  await open(page, { width: 1024, height: 768 }, { reduced: true });
  await walkThrough(page, [1132, 300], 'quarto');
  expect(await bia(page)).toMatchObject({ x: 68, y: 480 });
});
