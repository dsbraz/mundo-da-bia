import { expect, test, type Page } from '@playwright/test';
import { initialWorld } from '../src/domain/world';
import { initialAlbum } from '../src/domain/houses';
import { migrateNeighborhood } from '../src/domain/neighborhood';
import { encodeNeighborhood } from '../src/persistence/neighborhood';
import { fromPiece } from '../src/domain/layout';
import { seatSlots } from '../src/domain/seats';
import { visualPiecePoint } from '../src/presentation/furniture-scale';
import type { Piece, PieceKind, World } from '../src/domain/types';
import { point, read, ready } from './helpers';

const piece = (id: number, kind: PieceKind, x: number, y: number, active?: true): Piece => ({ id, kind, room: 'sala', x, y, color: 'original', flipped: false, ...(active ? { active } : {}) });
async function load(page: Page, world: World, width = 1024, height = 768) {
  await page.addInitScript(value => { if (!localStorage.getItem('mundo-da-bia:neighborhood:v3')) localStorage.setItem('mundo-da-bia:neighborhood:v3', value); },
    encodeNeighborhood(migrateNeighborhood(initialAlbum(world))));
  await page.setViewportSize({ width, height }); await ready(page);
}
const canvas = (page: Page) => page.locator('canvas');
/** Presses on Bia's chest and moves the finger so that her feet land on `feet` (the grab keeps the 110 px from chest to feet). */
async function carry(page: Page, from: { x: number; y: number }, feet: { x: number; y: number }) {
  const a = await point(page, from.x, from.y - 110), b = await point(page, feet.x, feet.y - 110);
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(a.x + 16, a.y); await page.mouse.move(b.x, b.y, { steps: 10 });
}
const feetOn = (sofa: Piece, slot: number) => visualPiecePoint(sofa, fromPiece(sofa, seatSlots.sofa![slot]!));

for (const [width, height, reduced] of [[1024, 768, false], [844, 390, false], [1024, 768, true]] as const) test(`arrastando a Bia, o assento livre e o espelho sob os pés acendem; o assento da Luna mostra o rosto dela (${width}${reduced ? ', movimento reduzido' : ''})`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const world = initialWorld();
  world.layout = { ...world.layout, pieces: [...world.layout.pieces, piece(100, 'mirror', 700, 130)], nextId: 101 };
  await load(page, world, width, height);
  const state = await read(page), sofa = state.layout.pieces.find(p => p.kind === 'sofa')!, bia = state.actors.find(a => a.id === 'bia')!;
  expect(state.actors.find(a => a.id === 'luna')!.seat).toBe('2.1');
  await carry(page, bia, feetOn(sofa, 0));
  await expect(canvas(page)).toHaveAttribute('data-drop-target', 'seat:2.0');
  await page.screenshot({ path: `reports/wave3-life-1b/drop-seat-${width}${reduced ? '-reduced' : ''}.png` });
  const taken = await point(page, feetOn(sofa, 1).x, feetOn(sofa, 1).y - 110);
  await page.mouse.move(taken.x, taken.y, { steps: 6 });
  await expect(canvas(page)).toHaveAttribute('data-drop-target', 'seat:2.1:luna');
  await page.screenshot({ path: `reports/wave3-life-1b/drop-taken-${width}${reduced ? '-reduced' : ''}.png` });
  const mirror = await point(page, 750, 420 - 110);
  await page.mouse.move(mirror.x, mirror.y, { steps: 10 });
  await expect(canvas(page)).toHaveAttribute('data-drop-target', 'mirror:100');
  await page.screenshot({ path: `reports/wave3-life-1b/drop-mirror-${width}${reduced ? '-reduced' : ''}.png` });
  await page.mouse.up();
  await expect(canvas(page)).toHaveAttribute('data-drop-target', '');
});

test('um objeto arrastado sobre a Luna acende um anel quente nos pés dela', async ({ page }) => {
  const world = initialWorld();
  world.actors = world.actors.map(a => a.id === 'luna' ? { ...a, seat: null, x: 300, y: 520 } : a);
  await load(page, world);
  const bear = (await read(page)).items.find(i => i.holder === null && i.spot === 'floor')!;
  const a = await point(page, bear.x, bear.y - 10), b = await point(page, 300, 420);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 10 });
  await expect(canvas(page)).toHaveAttribute('data-drop-target', 'person:luna');
  await page.screenshot({ path: 'reports/wave3-life-1b/drop-person-1024.png' });
  await page.keyboard.press('Escape'); await page.mouse.up();
});

for (const reduced of [false, true]) test(`TV, banheira, piano, caixa de som e aquário ligados mostram desenhos que se movem, sem texto${reduced ? ' (movimento reduzido: parados)' : ''}`, async ({ page }) => {
  if (reduced) await page.emulateMedia({ reducedMotion: 'reduce' });
  const world = initialWorld();
  world.layout = { ...world.layout, nextId: 110, rooms: { ...world.layout.rooms, sala: { ...world.layout.rooms.sala!, size: 'large' } },
    pieces: [piece(101, 'tv', 20, 240, true), piece(102, 'bath', 240, 280, true), piece(103, 'piano', 690, 260, true), piece(104, 'speaker', 920, 330, true), piece(105, 'aquarium', 1010, 270, true), piece(106, 'desk', 1200, 280, true)] };
  world.actors = world.actors.map(a => ({ ...a, room: a.id === 'bia' ? 'sala' : 'quarto', x: 560, y: 540, seat: null }));
  world.items = world.items.map(i => ({ ...i, room: 'quarto', spot: 'floor', x: 500, y: 520 }));
  await load(page, world, 1280, 800);
  await expect.poll(async () => (await canvas(page).getAttribute('data-uses'))?.split(' ').sort()).toEqual(['aquarium', 'bath', 'desk', 'piano', 'speaker', 'tv']);
  await page.screenshot({ path: `reports/wave3-life-1b/play-effects-1280${reduced ? '-reduced' : ''}.png` });
});
