import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { readTown } from './helpers';
import { openPro, proTown, tapStaff } from './pro-helpers';
import { openSchool, seatAt } from './school-helpers';

const canvas = (page: Page) => page.locator('canvas');
async function goTo(page: Page, building: string, room: string) {
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: `Ir para ${building}`, exact: true }).click();
  await page.locator('#map-toggle').click();
  await page.locator('#room-map').getByRole('button', { name: `Ir para ${room}`, exact: true }).click();
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
}

test('lote 7: chegando à sala de aula pelo Mapa a professora está lá; tocar nela com duas crianças sentadas começa a aula', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  const home = neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model: 'school' });
  await openPro(page, home);
  const school = home.buildings[1]!, classroom = Object.values(school.layout.rooms).find(r => r.template === 'classroom')!;
  await goTo(page, school.name, classroom.name);
  await expect(canvas(page)).toHaveAttribute('data-staff', /^teacher:/);
  // Nobody at a desk: the teacher asks for a seat, like her board.
  await tapStaff(page);
  await expect(page.locator('.missing-bubble:not(.thought)')).toHaveAttribute('data-need', 'seat');
  expect(errors).toEqual([]);
});

test('lote 7: tocar na professora com a Bia e o Léo sentados começa a aula, e ela fica no quadro', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page);
  await expect(canvas(page)).toHaveAttribute('data-staff', /^teacher:/);
  await seatAt(page, 'bia', 0); await seatAt(page, 'leo', 1);
  await tapStaff(page);
  await expect.poll(() => canvas(page).getAttribute('data-lesson')).toBe('sol:drawing');
  expect((await readTown(page)).progress.drawings).toEqual(['sol']);
  await page.clock.runFor(5000);
  await expect(canvas(page)).toHaveAttribute('data-staff-act', 'teacher');
});

for (const reduced of [false, true]) test(`lote 7: nos bombeiros, tocar no bombeiro joga água com a mangueira${reduced ? ' (movimento reduzido)' : ''}, e nada vai para o save`, async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  const town: Neighborhood = proTown('fire-station');
  await openPro(page, town);
  await expect(canvas(page)).toHaveAttribute('data-staff', /^firefighter:/);
  const before = await readTown(page);
  await tapStaff(page);
  await expect(canvas(page)).toHaveAttribute('data-staff-act', 'firefighter');
  // Nobody walked to the tap: the selected child stays where she was.
  expect((await readTown(page)).actors).toEqual(before.actors);
  await page.clock.runFor(2500);
  await expect(canvas(page)).toHaveAttribute('data-staff-act', '');
  expect(await readTown(page)).toEqual(before);
  expect(errors).toEqual([]);
});
