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

import { canPlace, footprint, freePlacement, overlap } from './placement';
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
  expect(canPlace(world, plant({ room: 'quarto', x: 500, y: 100 }))).toBe(true);
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
