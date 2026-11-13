import { expect, test, type Page } from '@playwright/test';
import { readTown } from './helpers';
import { openSchool, seatAt, tapBoard } from './school-helpers';

const lessonMark = (page: Page) => page.locator('canvas').getAttribute('data-lesson');

for (const reduced of [false, true]) test(`W3L-26: na escola, a Bia e o Léo sentam nas carteiras, o quadro se desenha${reduced ? ' pronto (movimento reduzido)' : ''} e em casa o desenho está na geladeira`, async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page);
  // Nobody at a desk yet: the board asks for a seat, and nothing is saved.
  await tapBoard(page);
  await expect(page.locator('.missing-bubble:not(.thought)')).toHaveAttribute('data-need', 'seat');
  expect((await readTown(page)).progress.drawings).toEqual([]);
  await seatAt(page, 'bia', 0); await seatAt(page, 'leo', 1);
  await tapBoard(page);
  await expect.poll(() => lessonMark(page)).toBe(reduced ? 'sol:done' : 'sol:drawing');
  expect((await readTown(page)).progress.drawings).toEqual(['sol']);
  // Nobody stood up to tap the board.
  expect((await readTown(page)).actors.filter(a => a.seat).map(a => a.id)).toEqual(expect.arrayContaining(['bia', 'leo']));
  if (!reduced) {
    await page.clock.runFor(10_000);
    expect(await lessonMark(page)).toBe('sol:drawing');
    await page.clock.runFor(10_500);
  }
  await expect.poll(() => lessonMark(page)).toBe('sol:done');
  // Home: the drawing of the day hangs on the fridge door.
  await page.locator('#map-toggle').click();
  await page.locator('#neighborhood-list').getByRole('button', { name: 'Ir para Minha casa', exact: true }).click();
  await expect.poll(async () => (await readTown(page)).location).toMatchObject({ kind: 'interior', building: 1 });
  await expect(page.locator('canvas')).toHaveAttribute('data-fridge-drawings', 'sol');
  expect(errors).toEqual([]);
});
