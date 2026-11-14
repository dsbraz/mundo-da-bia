import { expect, it } from 'vitest';
import { initialWorld } from './world';
import { editWorld } from './design';
it('recusa adicionar um sólido no espaço ocupado sem mudar ids ou histórico', () => {
  const world = initialWorld();
  const table = world.layout.pieces.find(p => p.kind === 'table')!;
  expect(editWorld(world, { type: 'add', kind: 'speaker', point: { x: table.x + 60, y: table.y + 60 } })).toBe(world);
});
it('permite recolorir uma peça de save antigo mesmo quando sobreposta', () => {
  const world = initialWorld(), sofa = world.layout.pieces.find(p => p.kind === 'sofa')!;
  expect(editWorld(world, { type: 'color', id: sofa.id, color: 'mint' }).layout.pieces.find(p => p.id === sofa.id)?.color).toBe('mint');
});

import { addRoom } from './rooms';
import { canPlace, floorBase, footprint, freePlacement, onFloorPiece, overlap } from './placement';
import type { Piece } from './types';
const plant = (patch: Partial<Piece> = {}): Piece => ({ id: 100, kind: 'plant', room: 'sala', x: 700, y: 350, color: 'original', flipped: false, ...patch });
it('áreas de chão preservam base, profundidade e exceções planas', () => {
  expect(footprint(plant())).toEqual({ left: 708, right: 777, top: 418.25, bottom: 447 });
  expect(footprint(plant({ kind: 'bed' }))).toEqual({ left: 708, right: 1117, top: 525, bottom: 617 });
  expect(footprint(plant({ kind: 'rug' }))).toBeNull();
  expect(overlap({ left: 0, right: 10, top: 0, bottom: 10 }, { left: 5, right: 15, top: 5, bottom: 15 })).toBe(25);
  expect(overlap({ left: 0, right: 10, top: 0, bottom: 10 }, { left: 10, right: 15, top: 0, bottom: 10 })).toBe(0);
});
it('protege passagem, limites e cômodos separados', () => {
  const world = editWorld(initialWorld(), { type: 'clear' });
  expect(canPlace(world, plant())).toBe(true);
  expect(canPlace(world, plant({ x: -1 }))).toBe(false);
  expect(canPlace(world, plant({ x: 520, y: 350 }))).toBe(false);
  expect(canPlace(world, plant({ kind: 'picture', x: 520 }))).toBe(true);
  expect(canPlace(world, plant({ kind: 'picture', room: 'quarto', x: 500, y: 100 }))).toBe(true);
});
it('permite reduzir sobreposição antiga, mas não aumentá-la', () => {
  const world = editWorld(initialWorld(), { type: 'clear' });
  world.layout.pieces.push(plant(), plant({ id: 101, x: 720 }));
  expect(canPlace(world, plant({ x: 690 }))).toBe(true);
  expect(canPlace(world, plant({ x: 710 }))).toBe(false);
  expect(canPlace(world, plant())).toBe(false);
  expect(canPlace(world, plant({ x: 620 }))).toBe(true);
});
it('encontra colocação próxima e retorna ausência quando não há espaço', () => {
  const world = editWorld(initialWorld(), { type: 'clear' });
  const placed = freePlacement(world, plant());
  expect(placed).toBeDefined(); expect(canPlace(world, placed!)).toBe(true);
  world.layout.rooms.sala.size = 'small';
  for (let y = 65; y <= 500; y += 40) for (let x = 0; x < 1000; x += 60) world.layout.pieces.push(plant({ id: 200 + world.layout.pieces.length, x, y }));
  expect(freePlacement(world, plant())).toBeUndefined();
});
it('móveis de chão ficam com o pé no chão: mover a cama para a parede a encosta no rodapé; quadro, neon e espelho podem ficar na parede', () => {
  const world = initialWorld(), bed = world.layout.pieces.find(p => p.kind === 'bed')!;
  expect(canPlace(world, { ...bed, y: 40 + 65 })).toBe(false);
  expect(canPlace(editWorld(world, { type: 'clear' }), plant({ y: floorBase - 105 - 1 }))).toBe(false);
  expect(canPlace(editWorld(world, { type: 'clear' }), plant({ y: floorBase - 105 }))).toBe(true);
  const empty = editWorld({ ...world, room: 'quarto' }, { type: 'clear' });
  const withBed = editWorld(empty, { type: 'add', kind: 'bed', point: { x: 765, y: 150 } });
  const newBed = withBed.layout.pieces.at(-1)!; expect(newBed.kind).toBe('bed'); expect(newBed.y + 275).toBe(floorBase);
  const lowered = editWorld(withBed, { type: 'move', id: newBed.id, point: { x: newBed.x, y: newBed.y + 60 } });
  const onWall = editWorld(lowered, { type: 'move', id: newBed.id, point: { x: newBed.x, y: 70 } });
  const moved = onWall.layout.pieces.find(p => p.id === newBed.id)!;
  expect(moved.y + 275).toBe(floorBase); expect(moved.x).toBe(newBed.x);
  const cleared = editWorld(initialWorld(), { type: 'clear' });
  for (const kind of ['picture', 'neon', 'mirror'] as const) expect(canPlace(cleared, plant({ kind, x: 300, y: 100 }))).toBe(true);
  const added = editWorld(cleared, { type: 'add', kind: 'plant', point: { x: 200, y: 120 } });
  const pot = added.layout.pieces.at(-1)!; expect(pot.kind).toBe('plant'); expect(pot.y + 105).toBeGreaterThanOrEqual(floorBase);
  expect(onFloorPiece({ ...bed, y: 300 })).toEqual({ ...bed, y: 300 });
});
it('nada se põe nas passagens: portas do fim da parede, escada e vão da escada; o que já estava lá só pode sair', () => {
  const world = editWorld(initialWorld(), { type: 'clear' });
  // The living room's doorway to the bedroom spans x 1080-1184 (frame 1071-1193), up to the sill at 410.
  expect(canPlace(world, plant({ x: 1100, y: 300 }))).toBe(false);
  expect(canPlace(world, plant({ kind: 'picture', x: 1100, y: 200 }))).toBe(false);
  expect(canPlace(world, plant({ x: 980, y: 300 }))).toBe(true);
  expect(canPlace(world, plant({ x: 1100, y: 430 }))).toBe(true);
  expect(canPlace(world, plant({ kind: 'rug', x: 0, y: 440 }))).toBe(true);
  expect(canPlace(world, plant({ x: 60, y: 300 }))).toBe(true);
  const upstairs = addRoom(world, { name: 'Sótão', template: 'empty', size: 'small', cell: 4 });
  const below = { ...upstairs, room: 'sala' as const }, above = { ...upstairs, room: 'room-3' as const };
  expect(canPlace(below, plant({ x: 60, y: 300 }))).toBe(false);
  expect(canPlace(above, plant({ room: 'room-3', x: 100, y: 450 }))).toBe(false);
  expect(canPlace(above, plant({ room: 'room-3', x: 300, y: 450 }))).toBe(true);
  // A piece of an older save already standing there may move out, or less in, never further in.
  below.layout.pieces.push(plant({ x: 60, y: 300 }));
  expect(canPlace(below, plant({ x: 120, y: 300 }))).toBe(true);
  expect(canPlace(below, plant({ x: 20, y: 300 }))).toBe(false);
});
