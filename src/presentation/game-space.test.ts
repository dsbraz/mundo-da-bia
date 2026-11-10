import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { footprint } from '../domain/placement';
import { floorTop } from './floor-band';
import { freestFloor, gameSpace, hopBoard, hopFocus, hopPosition, hopTiles, stepAside } from './game-space';

it('mantém todas as casas no piso, com profundidade e pares de pés na mesma linha', () => {
  const origin = { x: 650, y: 530 };
  expect(hopTiles.every(t => origin.y + t.y >= 400)).toBe(true);
  expect(hopPosition(origin, 3)).toEqual(hopPosition(origin, 4));
  expect(hopPosition(origin, 6)).toEqual(hopPosition(origin, 7));
  expect(hopPosition(origin, 8).x).toBeGreaterThan(origin.x);
});

it('recusa uma área tomada por móveis ou pessoas e encontra chão livre sem atravessá-los', () => {
  const world = initialWorld();
  expect(gameSpace(world, world.actors[0]!, 'hopscotch')).toBeNull();
  world.layout.pieces = []; world.actors.forEach(a => { a.x = 200; });
  world.items.forEach(i => { i.x = 100; });
  world.actors[0]!.x = 650;
  const point = gameSpace(world, world.actors[0]!, 'hopscotch');
  expect(point).not.toBeNull(); expect(point!.y).toBe(530);
});
it('quintal novo conserva espaço para amarelinha com toda a mobília', async () => {
  const { addRoom } = await import('../domain/rooms');
  const world = addRoom(initialWorld(), { name: 'Quintal', template: 'playground', size: 'small', cell: 2 });
  world.actors = [{ ...world.actors[0]!, room: world.room, x: 650, y: 530 }]; world.items = [];
  expect(world.layout.pieces.filter(p => p.room === world.room)).toHaveLength(3);
  expect(gameSpace(world, world.actors[0]!, 'hopscotch')).not.toBeNull();
});

it('sem espaço totalmente livre, escolhe o chão mais livre e alcançável em vez de recusar', () => {
  const world = initialWorld(), bia = world.actors[0]!;
  expect(gameSpace(world, bia, 'hopscotch')).toBeNull();
  const point = freestFloor(world, bia, 'hopscotch')!;
  expect(point.y).toBe(530); expect(point.x).toBeGreaterThanOrEqual(130); expect(point.x).toBeLessThanOrEqual(870);
  const crowded = { ...world, layout: { ...world.layout, pieces: [] } };
  expect(gameSpace(crowded, bia, 'hopscotch')).toBeNull();
  expect(freestFloor(crowded, bia, 'hopscotch')).toEqual({ x: 530, y: 530 });
  expect(freestFloor({ ...world, streetWidth: 3000 }, bia, 'rope')).toBeNull();
});

it('o tabuleiro e o foco da câmera cobrem as 8 casas', () => {
  const origin = { x: 570, y: 530 }, board = hopBoard(origin), focus = hopFocus(origin);
  for (const t of hopTiles) {
    expect(origin.x + t.x - 47).toBeGreaterThanOrEqual(board.left); expect(origin.x + t.x + 47).toBeLessThanOrEqual(board.right);
    expect(origin.y + t.y - 10).toBeGreaterThanOrEqual(board.top); expect(origin.y + t.y + 10).toBeLessThanOrEqual(board.bottom);
  }
  expect(focus.x - board.left).toBeCloseTo(board.right - focus.x, 0);
});
/** A character's drawn body (feet at its point; a seat raises the feet 19). */
const body = (a: { kind: string; x: number; y: number; seat?: unknown }) => {
  const half = a.kind === 'cat' ? 35 : 42, foot = a.y + (a.seat ? 19 : 0);
  return { left: a.x - half, right: a.x + half, top: foot - (a.kind === 'cat' ? 94 : 189), bottom: foot };
};
const meets = (a: ReturnType<typeof body>, b: ReturnType<typeof body>) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
it('quem ficaria sobre o giz ou colado à criança em alguma casa dá passos para o lado, no chão, sem ficar atrás de móvel; quem está longe fica', () => {
  const world = initialWorld(), bia = world.actors[0]!, origin = freestFloor(world, bia, 'hopscotch')!;
  const moves = stepAside(world, bia, origin), board = hopBoard(origin);
  expect(moves.length).toBeGreaterThan(0); expect(moves.some(m => m.actor === 'bia')).toBe(false);
  const moved = { ...world, actors: world.actors.map(a => { const m = moves.find(n => n.actor === a.id); return m ? { ...a, ...m.point, seat: null } : a; }) };
  // Nobody's body touches the child's at any square, nor stands over the board.
  const child = [origin, ...hopTiles.map(t => hopPosition(origin, t.cell))].map(p => body({ ...bia, ...p, seat: null }));
  for (const a of moved.actors.filter(a => a.id !== 'bia' && a.room === world.room)) {
    for (const [i, c] of child.entries()) expect(meets(body(a), c), `${a.id} colado à criança na posição ${i}`).toBe(false);
    expect(body(a).right <= board.left || body(a).left >= board.right, `${a.id} sobre o tabuleiro`).toBe(true);
  }
  for (const m of moves) {
    const actor = world.actors.find(a => a.id === m.actor)!;
    expect(m.point.y).toBeGreaterThanOrEqual(floorTop(world)); expect(Math.abs(m.point.x - actor.x)).toBeLessThanOrEqual(260);
    // Never behind a piece drawn in front of the spot (the stage, the sofa).
    for (const piece of world.layout.pieces.filter(p => p.room === world.room)) {
      const b = footprint(piece); if (!b || b.bottom + 8 <= m.point.y) continue;
      expect(m.point.x + 42 <= b.left || m.point.x - 42 >= b.right, `${m.actor} atrás de ${piece.kind}`).toBe(true);
    }
  }
  const xs = moves.map(m => m.point.x); for (const x of xs) expect(xs.filter(y => Math.abs(y - x) < 55)).toHaveLength(1);
  expect(stepAside(moved, bia, origin)).toEqual([]);
  const far = { ...world, actors: world.actors.map(a => a.id === 'bia' ? a : { ...a, x: 100, seat: null }) };
  expect(stepAside(far, bia, { x: 600, y: 530 })).toEqual([]);
});
