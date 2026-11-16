import { expect, test, type Page } from '@playwright/test';
import { drag, read, readTown } from './helpers';
import { itemPoint } from '../src/presentation/targets';
import { chooseSubject, openSchool, schoolTown, seatAt, tapBoard } from './school-helpers';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import { fromPiece } from '../src/domain/layout';
import { seatSlots } from '../src/domain/seats';

const canvas = (page: Page) => page.locator('canvas');
const subjects = [
  { name: 'Desenho', paper: 'sol' }, { name: 'Escrita', paper: 'palavra-bia' }, { name: 'Matemática', paper: 'conta-2-3' },
] as const;
/** The classroom's room turned into a plain room (no teacher works there): a board and desks at home, say. */
function withoutTeacher(): Neighborhood {
  const town = schoolTown(), school = town.buildings[1]!, room = school.layout.rooms.quarto!;
  return { ...town, buildings: town.buildings.map(b => b === school ? { ...b, layout: { ...b.layout, rooms: { ...b.layout.rooms, quarto: { ...room, template: 'bedroom' as typeof room.template } } } } : b) };
}

for (const subject of subjects) test(`lote 8D: a matéria ${subject.name}: a professora escreve no quadro com o giz e a folha fica na mão da Bia; largada no chão, não vai para a geladeira`, async ({ page }) => {
  // 20 s of chalk strokes repainted every frame, then the walk home: slow to render in CI's software GL.
  test.setTimeout(150_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page);
  // The last one dragged is the selected one: the Bia, who gets the paper.
  await seatAt(page, 'leo', 1); await seatAt(page, 'bia', 0);
  await tapBoard(page);
  // Three drawn buttons; nothing is kept until one is chosen.
  await expect(page.locator('#subject-chooser .subject-choice')).toHaveCount(3);
  expect((await readTown(page)).progress.papers).toEqual([]);
  await chooseSubject(page, subject.name);
  await expect.poll(() => canvas(page).getAttribute('data-lesson')).toBe(`${subject.paper}:drawing`);
  // The school's teacher left her place for the board, and writes there.
  await page.clock.runFor(6000);
  await expect(canvas(page)).toHaveAttribute('data-lesson-writer', 'teacher:writing');
  await expect(canvas(page)).toHaveAttribute('data-staff-act', 'teacher');
  await page.clock.runFor(14_500);
  await expect(canvas(page)).toHaveAttribute('data-lesson', `${subject.paper}:done`);
  await page.clock.runFor(1000);
  await expect(canvas(page)).toHaveAttribute('data-lesson-writer', '');
  // Bia's request: the paper is in her hand, kept in the collection and not on the fridge.
  await expect.poll(async () => (await readTown(page)).items.find(i => i.kind === 'papel')).toMatchObject({ paper: subject.paper, holder: 'bia' });
  expect((await readTown(page)).progress).toMatchObject({ drawings: [], papers: [subject.paper] });
  // Home: let go on the floor, away from the fridge, it lies there and the fridge door stays empty.
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: 'Ir para Minha casa', exact: true }).click();
  await expect.poll(async () => (await readTown(page)).location).toMatchObject({ kind: 'interior', building: 1 });
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  // The arrival may still be settling under the paused clock: let it run and drag again until the paper is let go.
  await expect(async () => {
    await page.clock.runFor(1000);
    const world = await read(page), hand = itemPoint(world, world.items.find(i => i.kind === 'papel')!)!;
    // A bare spot of floor: nobody stands there (a drop on someone hands it over) and it is far from the fridge.
    const floor = [150, 250, 350, 450, 550, 900, 950].find(x => world.actors.every(a => a.room !== world.room || Math.abs(a.x - x) > 60))!;
    await drag(page, [hand.x, hand.y], [floor, 470]);
    await expect.poll(async () => (await readTown(page)).items.find(i => i.kind === 'papel'), { timeout: 3000 }).toMatchObject({ paper: subject.paper, holder: null, spot: 'floor' });
  }).toPass({ timeout: 30_000 });
  await expect(canvas(page)).toHaveAttribute('data-fridge-drawings', '');
  expect((await readTown(page)).progress).toMatchObject({ drawings: [], papers: [subject.paper] });
  expect(errors).toEqual([]);
});

test('lote 8D, #30: num quadro sem professora (um quarto), a Bia selecionada vai ao quadro e escreve a aula, ninguém aparece do nada; fechar a escolha não guarda nada', async ({ page }) => {
  // 20 s of chalk strokes repainted every frame, then the walk home: slow to render in CI's software GL.
  test.setTimeout(150_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  // Léo already at a desk; the Bia (selected) standing.
  const plain = withoutTeacher(), desk = plain.buildings[1]!.layout.pieces.find(p => p.room === 'quarto' && p.kind === 'school-desk')!;
  const seat = fromPiece(desk, seatSlots['school-desk']![0]!);
  await openSchool(page, { ...plain, actors: plain.actors.map(a => a.id === 'leo' ? { ...a, seat: `${desk.id}.0` as const, x: seat.x, y: seat.y } : a) });
  await expect(canvas(page)).toHaveAttribute('data-staff', '');
  await tapBoard(page);
  await page.locator('#subject-chooser').getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.locator('#subject-chooser')).toBeHidden();
  expect((await readTown(page)).progress.papers).toEqual([]);
  await tapBoard(page);
  await chooseSubject(page, 'Matemática');
  // She walks to the side of the board and writes there: the school's teacher never comes.
  const writer = async () => (await canvas(page).getAttribute('data-lesson-writer')) ?? '';
  for (let t = 0; t < 8000 && !(await writer()).startsWith('bia:'); t += 250) { await page.clock.runFor(250); expect(await writer()).not.toMatch(/^teacher/); }
  expect(await writer()).toMatch(/^bia:/);
  const board = plain.buildings[1]!.layout.pieces.find(p => p.room === 'quarto' && p.kind === 'board')!;
  const bia = (await readTown(page)).actors.find(a => a.id === 'bia')!;
  expect(bia.seat).toBeNull(); expect(Math.abs(bia.x - board.x - 400)).toBeLessThan(200);
  await page.clock.runFor(10_000);
  await expect(canvas(page)).toHaveAttribute('data-lesson', 'conta-2-3:drawing');
  expect(await writer()).toMatch(/^bia:/);
  await page.clock.runFor(10_500);
  await expect(canvas(page)).toHaveAttribute('data-lesson', 'conta-2-3:done');
  await expect(canvas(page)).toHaveAttribute('data-staff', '');
  // The Bia wrote it at the board: the paper goes into the pupil's hand, the Léo's.
  await expect.poll(async () => (await readTown(page)).items.find(i => i.kind === 'papel')).toMatchObject({ paper: 'conta-2-3', holder: 'leo' });
  expect((await readTown(page)).progress).toMatchObject({ drawings: [], papers: ['conta-2-3'] });
  expect(errors).toEqual([]);
});
