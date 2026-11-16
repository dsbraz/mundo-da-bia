import { expect, test, type Page } from '@playwright/test';
import { drag, onPiece, read, readTown } from './helpers';
import { itemPoint } from '../src/presentation/targets';
import { chooseSubject, openSchool, seatAt, tapBoard } from './school-helpers';

const lessonMark = (page: Page) => page.locator('canvas').getAttribute('data-lesson');

for (const reduced of [false, true]) test(`W3L-26: na escola, a Bia e o Léo sentam nas carteiras, o quadro se desenha${reduced ? ' aos passos (movimento reduzido)' : ''} e a folha fica na mão da Bia: em casa, arrastada para a geladeira, ela é pendurada`, async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page);
  // Nobody at a desk yet: the board asks for a seat, and nothing is saved.
  await tapBoard(page);
  await expect(page.locator('.missing-bubble:not(.thought)')).toHaveAttribute('data-need', 'seat');
  expect((await readTown(page)).progress.papers).toEqual([]);
  // The last one dragged is the selected one: the Bia, who gets the paper.
  await seatAt(page, 'leo', 1); await seatAt(page, 'bia', 0);
  await tapBoard(page);
  await chooseSubject(page);
  await expect.poll(() => lessonMark(page)).toBe('sol:drawing');
  expect((await readTown(page)).progress).toMatchObject({ drawings: [], papers: ['sol'] });
  // Nobody stood up to tap the board.
  expect((await readTown(page)).actors.filter(a => a.seat).map(a => a.id)).toEqual(expect.arrayContaining(['bia', 'leo']));
  // With reduced motion too the lesson takes its 20 s: the drawing comes in steps, the teacher still at the board.
  await page.clock.runFor(10_000);
  expect(await lessonMark(page)).toBe('sol:drawing');
  await page.clock.runFor(10_500);
  await expect.poll(() => lessonMark(page)).toBe('sol:done');
  // Bia's request: the drawing of the day is in her hand, not on the fridge.
  await expect.poll(async () => (await readTown(page)).items.find(i => i.kind === 'papel')).toMatchObject({ paper: 'sol', holder: 'bia' });
  expect((await readTown(page)).progress.drawings).toEqual([]);
  // Home with it: the fridge door is empty until she drags the paper onto it.
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: 'Ir para Minha casa', exact: true }).click();
  await expect.poll(async () => (await readTown(page)).location).toMatchObject({ kind: 'interior', building: 1 });
  if (await page.locator('#close-map').isVisible()) await page.locator('#close-map').click();
  await expect(page.locator('canvas')).toHaveAttribute('data-fridge-drawings', '');
  // The arrival may still be settling under the paused clock: let it run and drag again until the paper hangs.
  await expect(async () => {
    await page.clock.runFor(1000);
    const world = await read(page), hand = itemPoint(world, world.items.find(i => i.kind === 'papel')!)!;
    await drag(page, [hand.x, hand.y], await onPiece(page, 'fridge', 680, 282));
    await expect(page.locator('canvas')).toHaveAttribute('data-fridge-drawings', 'sol', { timeout: 3000 });
  }).toPass({ timeout: 30_000 });
  expect((await readTown(page)).progress).toMatchObject({ drawings: ['sol'], papers: ['sol'] });
  expect((await readTown(page)).items.some(i => i.kind === 'papel')).toBe(false);
  expect(errors).toEqual([]);
});
