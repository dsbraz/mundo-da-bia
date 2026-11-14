import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood, neighborhoodAction } from '../src/domain/neighborhood';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { drag, readTown, swipe } from './helpers';
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

test('lote 7: levar a Bia pela beirada do cômodo dos bombeiros e deslizar de volta não quebra o bombeiro', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openPro(page, proTown('fire-station'));
  await expect(canvas(page)).toHaveAttribute('data-staff', /^firefighter:/);
  // Grabbed 75 above her feet and let go with the feet on the floor's right edge (lot 8A): she walks off it.
  await drag(page, [420, 460], [1170, 425]);
  await expect.poll(async () => (await readTown(page)).location).toMatchObject({ room: 'quarto' });
  await expect(canvas(page)).toHaveAttribute('data-staff', '');
  await swipe(page, 300, 700);
  await expect(canvas(page)).toHaveAttribute('data-ready', 'true');
  expect(errors).toEqual([]);
});

/** Lot 8A: whoever enters by the Map arrives in the entry room, and its professional is there and in view (also in an old building
 *  whose rooms have no template, from before the institution plans). */
async function enterByMap(page: Page, town: Neighborhood) {
  await openPro(page, town);
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: `Ir para ${town.buildings[1]!.name}`, exact: true }).click();
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  await expect.poll(async () => (await readTown(page)).location).toMatchObject({ kind: 'interior', building: 2, room: town.buildings[1]!.entry });
}
async function staffInView(page: Page, profession: string) {
  await expect(canvas(page)).toHaveAttribute('data-staff', new RegExp(`^${profession}:`));
  const x = Number((await canvas(page).getAttribute('data-staff'))!.split(':')[1]!.split(',')[0]);
  const view = await canvas(page).evaluate(c => ({ x: Number(c.dataset.viewX), width: Number(c.dataset.viewWidth) }));
  expect(x - 64).toBeGreaterThanOrEqual(view.x); expect(x + 64).toBeLessThanOrEqual(view.x + view.width);
}
const built = (model: Parameters<typeof proTown>[0]) => neighborhoodAction(migrateNeighborhood(initialAlbum(initialWorld())), { type: 'construct', plot: 1, model });
for (const [model, profession] of [['school', 'teacher'], ['hospital', 'doctor'], ['fire-station', 'firefighter'], ['police', 'police'], ['sports-club', 'coach'], ['stadium', 'coach'], ['office', 'clerk']] as const) {
  test(`lote 8A: entrando em ${model} pelo Mapa, ${profession} recebe à vista`, async ({ page }) => {
    await enterByMap(page, built(model));
    await staffInView(page, profession);
  });
}
test('lote 8A: numa escola antiga, de cômodos sem modelo, a professora recebe na entrada', async ({ page }) => {
  const town = built('school'), school = town.buildings[1]!;
  const rooms = Object.fromEntries(Object.entries(school.layout.rooms).map(([id, r]) => [id, { ...r, template: 'empty' as const }])) as typeof school.layout.rooms;
  await enterByMap(page, { ...town, buildings: [town.buildings[0]!, { ...school, layout: { ...school.layout, rooms, pieces: [] } }] });
  await staffInView(page, 'teacher');
});
