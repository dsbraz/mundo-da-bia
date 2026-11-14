import { expect, test, type Page } from '@playwright/test';
import { readTown } from './helpers';
import { chooseSubject, openSchool, schoolTown, seatAt, tapBoard } from './school-helpers';
import type { Neighborhood } from '../src/domain/neighborhood-types';

const canvas = (page: Page) => page.locator('canvas');
const subjects = [
  { name: 'Desenho', paper: 'sol' }, { name: 'Escrita', paper: 'palavra-bia' }, { name: 'Matemática', paper: 'conta-2-3' },
] as const;
/** The classroom's room turned into a plain room (no teacher works there): a board and desks at home, say. */
function withoutTeacher(): Neighborhood {
  const town = schoolTown(), school = town.buildings[1]!, room = school.layout.rooms.quarto!;
  return { ...town, buildings: town.buildings.map(b => b === school ? { ...b, layout: { ...b.layout, rooms: { ...b.layout.rooms, quarto: { ...room, template: 'bedroom' as typeof room.template } } } } : b) };
}

for (const subject of subjects) test(`lote 8D: a matéria ${subject.name}: a professora escreve no quadro com o giz e a folha vai para a geladeira`, async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page);
  await seatAt(page, 'bia', 0); await seatAt(page, 'leo', 1);
  await tapBoard(page);
  // Three drawn buttons; nothing is kept until one is chosen.
  await expect(page.locator('#subject-chooser .subject-choice')).toHaveCount(3);
  expect((await readTown(page)).progress.drawings).toEqual([]);
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
  expect((await readTown(page)).progress.drawings).toEqual([subject.paper]);
  // Home: the lesson's paper hangs on the fridge door.
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: 'Ir para Minha casa', exact: true }).click();
  await expect(canvas(page)).toHaveAttribute('data-fridge-drawings', subject.paper);
  expect(errors).toEqual([]);
});

test('lote 8D: num quadro sem professora (um quarto), ela vem escrever a aula; fechar a escolha não guarda nada', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page, withoutTeacher());
  await expect(canvas(page)).toHaveAttribute('data-staff', '');
  await seatAt(page, 'bia', 0);
  await tapBoard(page);
  await page.locator('#subject-chooser').getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.locator('#subject-chooser')).toBeHidden();
  expect((await readTown(page)).progress.drawings).toEqual([]);
  await tapBoard(page);
  await chooseSubject(page, 'Matemática');
  // Reduced motion: she is at the board at once, the sum comes in steps and its result only at the end.
  await expect(canvas(page)).toHaveAttribute('data-lesson-writer', /^teacher:/);
  await page.clock.runFor(10_000);
  await expect(canvas(page)).toHaveAttribute('data-lesson', 'conta-2-3:drawing');
  await page.clock.runFor(10_500);
  await expect(canvas(page)).toHaveAttribute('data-lesson', 'conta-2-3:done');
  await expect(canvas(page)).toHaveAttribute('data-staff', '');
  expect((await readTown(page)).progress.drawings).toEqual(['conta-2-3']);
  expect(errors).toEqual([]);
});
