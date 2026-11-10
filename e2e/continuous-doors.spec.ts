import { expect, test, type Page } from '@playwright/test';
import { plotStart } from '../src/domain/neighborhood-geometry';
import { playUntil as play, point, readTown, tap } from './helpers';

const canvas = (page: Page) => page.locator('canvas');
/** Plays scene time in 50 ms frames until the canvas attribute reads `value`. */
const playUntil = (page: Page, name: string, value: string) => play(page, () => canvas(page).getAttribute(name), value);
async function clip(page: Page, x: number, top: number, bottom: number) {
  const a = await point(page, x - 170, top), b = await point(page, x + 170, bottom);
  return { x: a.x, y: a.y, width: b.x - a.x, height: b.y - a.y };
}

for (const reduced of [false, true]) test(`tocar na porta faz a Bia andar até ela, entrar e sair andando pela porta do outro lado${reduced ? ' (movimento reduzido: fades)' : ''}`, async ({ page }) => {
  const suffix = reduced ? '-reduced' : '';
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.setViewportSize({ width: 1280, height: 800 }); await page.goto('/');
  await expect(canvas(page)).toHaveAttribute('data-ready', 'true');
  await page.clock.pauseAt(new Date('2026-01-01T00:01:00Z'));
  // Inside: a tap on the "Rua" door. She walks there first; the place only changes once she goes in.
  await tap(page, 550, 300);
  expect((await readTown(page)).location.kind).toBe('interior');
  await playUntil(page, 'data-door', 'enter');
  expect(Math.abs((await readTown(page)).actors[0]!.x - 550)).toBeLessThanOrEqual(10);
  await page.screenshot({ path: `reports/door-leave${suffix}.png`, clip: await clip(page, 550, 150, 560) });
  await playUntil(page, 'data-street', 'true');
  expect((await readTown(page)).actors[0]!.location).toEqual({ kind: 'street' });
  // On the street she walks out of the house door.
  await expect(canvas(page)).toHaveAttribute('data-strolling', 'bia');
  const door = plotStart(0) + 220;
  await page.clock.runFor(reduced ? 60 : 120);
  await page.screenshot({ path: `reports/door-street-out${suffix}.png`, clip: await clip(page, door, 250, 560) });
  await playUntil(page, 'data-strolling', '');
  // Back in through the facade door.
  await tap(page, door, 380);
  expect((await readTown(page)).location).toEqual({ kind: 'street' });
  await playUntil(page, 'data-door', 'enter');
  expect(Math.abs((await readTown(page)).actors[0]!.x - door)).toBeLessThanOrEqual(10);
  await page.screenshot({ path: `reports/door-enter${suffix}.png`, clip: await clip(page, door, 250, 560) });
  await playUntil(page, 'data-street', 'false');
  const town = await readTown(page);
  expect(town.location).toEqual({ kind: 'interior', building: 1, room: 'sala' });
  // In front of the "Rua" door (x 498-602), not in the left corner, walking out of its doorway.
  expect(town.actors[0]).toMatchObject({ location: town.location, x: 550, y: 480 });
  await expect(canvas(page)).toHaveAttribute('data-strolling', 'bia');
  await page.clock.runFor(reduced ? 60 : 150);
  await page.screenshot({ path: `reports/door-exit${suffix}.png`, clip: await clip(page, 550, 150, 560) });
  await playUntil(page, 'data-strolling', '');
  // Nothing held the input: a tap right away walks.
  await tap(page, 800, 500); await playUntil(page, 'data-walking', 'bia');
});
