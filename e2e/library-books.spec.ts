import { expect, test, type Page } from '@playwright/test';
import { borrow } from '../src/domain/library';
import { pieceBounds } from '../src/domain/layout';
import { visualPiecePoint } from '../src/presentation/furniture-scale';
import type { Neighborhood } from '../src/domain/neighborhood-types';
import type { RoomId } from '../src/domain/types';
import { drag, readTown, tap } from './helpers';
import { openSchool, schoolTown, seatAt } from './school-helpers';
import { playMinutes, playUntilTrue } from './session';

// Lot 8C: the school's bookcases lend real books. Captures for the art review at 1024×768 and 1280×800.
const sizes = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }];
const shot = (view: string, width: number) => `reports/review/lot8c-${view}-${width}.png`;
const canvas = (page: Page) => page.locator('canvas');
const face = async (page: Page, id: string) => Object.fromEntries((await canvas(page).getAttribute('data-faces'))!.split(' ').map(f => f.split(':')))[id];
const bookcaseOf = (town: Neighborhood, room: RoomId) => town.buildings[1]!.layout.pieces.find(p => p.room === room && p.kind === 'bookcase')!;
const books = async (page: Page) => (await readTown(page)).items.filter(i => i.kind === 'livro');
/** A tap on the middle of the bookcase's drawing (she walks there first). */
async function tapBookcase(page: Page, room: RoomId) {
  const piece = bookcaseOf(await readTown(page), room), p = visualPiecePoint(piece, { x: piece.x + 80, y: piece.y + 120 });
  await tap(page, p.x, p.y);
}
/** The school with `who` standing in its library (the view there), the autonomy off. */
function inLibrary(who: string): Neighborhood {
  const town = schoolTown(), library = { kind: 'interior' as const, building: 2, room: 'room-3' as const };
  return { ...town, location: library, actors: town.actors.map(a => a.id === who ? { ...a, location: library, room: 'room-3', seat: null, x: 560, y: 535 } : a.id === 'bia' || a.id === 'leo' ? { ...a, location: { kind: 'interior', building: 1, room: 'sala' }, room: 'sala' } : a) };
}

for (const size of sizes) test(`lote 8C a ${size.width}: tocar na estante dá um livro (a estante fica com o vão), sentar na carteira é ler, tocar de novo devolve`, async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize(size);
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page);
  const shelf = bookcaseOf(await readTown(page), 'quarto');
  await expect(canvas(page)).toHaveAttribute('data-bookcases', `${shelf.id}:-`);
  await page.screenshot({ path: shot('shelf-before', size.width) });
  await tapBookcase(page, 'quarto');
  await expect.poll(async () => (await books(page)).map(b => [b.holder, b.loan])).toEqual([['bia', { building: 2, piece: shelf.id, slot: 0 }]]);
  await expect(canvas(page)).toHaveAttribute('data-bookcases', `${shelf.id}:0`);
  await page.clock.runFor(600);
  await page.screenshot({ path: shot('shelf-after', size.width) });
  // With the book, sitting at a desk is reading: the open book and the floating cue.
  await seatAt(page, 'bia', 0);
  await expect(canvas(page)).toHaveAttribute('data-reading', 'bia');
  await page.clock.runFor(900);
  await page.screenshot({ path: shot('reading-desk', size.width) });
  // A tap on the bookcase again: she walks there and puts the book back; the gap is filled.
  await tapBookcase(page, 'quarto');
  await expect.poll(async () => (await books(page)).length).toBe(0);
  await expect(canvas(page)).toHaveAttribute('data-bookcases', `${shelf.id}:-`);
  expect(errors).toEqual([]);
});

test('lote 8C: com o Rui muito entediado, ler na poltrona da biblioteca alivia o tédio (o rosto entediado vai embora)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await page.addInitScript(() => localStorage.setItem('mundo-da-bia:autonomy', 'off'));
  await openSchool(page, inLibrary('rui'));
  await page.locator('#tray-toggle').click(); await page.locator('#cast [data-actor=rui]').click(); await page.locator('#tray-toggle').click();
  await tapBookcase(page, 'room-3');
  await expect.poll(async () => (await books(page)).map(b => b.holder)).toEqual(['rui']);
  // Rui (boredom ×1.4) left standing still: about 10 minutes later his boredom is in `precisa`, the bored face.
  await playMinutes(page, 9);
  await playUntilTrue(page, async () => await face(page, 'rui') === 'bored', 3);
  const armchair = (await readTown(page)).buildings[1]!.layout.pieces.find(p => p.room === 'room-3' && p.kind === 'armchair')!;
  const rui = (await readTown(page)).actors.find(a => a.id === 'rui')!, seat = visualPiecePoint(armchair, { x: armchair.x + 90, y: armchair.y + 145 });
  await drag(page, [rui.x, rui.y - 60], [seat.x, seat.y - 60]);
  await expect(canvas(page)).toHaveAttribute('data-reading', 'rui');
  // Reading −30: back to `pede`, no longer the bored face.
  await expect.poll(() => face(page, 'rui')).not.toBe('bored');
  await page.clock.runFor(900);
  await page.screenshot({ path: shot('reading-library', 1024) });
  await page.setViewportSize({ width: 1280, height: 800 }); await page.clock.runFor(300);
  await page.screenshot({ path: shot('reading-library', 1280) });
});

test('lote 8C: um livro largado no chão volta para a estante quando é arrastado até ela', async ({ page }) => {
  const town = schoolTown(), shelf = bookcaseOf(town, 'quarto');
  const lent = borrow(town, 'bia', shelf.id).town;
  const dropped = { ...lent, items: lent.items.map(i => i.kind === 'livro' ? { ...i, holder: null, x: 640, y: 540 } : i) };
  await page.clock.install({ time: new Date('2026-11-13T09:00:00') });
  await openSchool(page, dropped);
  await expect(canvas(page)).toHaveAttribute('data-bookcases', `${shelf.id}:0`);
  const target = visualPiecePoint(shelf, { x: shelf.x + pieceBounds.bookcase.width / 2, y: shelf.y + 110 });
  await drag(page, [640, 525], [target.x, target.y]);
  await expect.poll(async () => (await books(page)).length).toBe(0);
  await expect(canvas(page)).toHaveAttribute('data-bookcases', `${shelf.id}:-`);
});
