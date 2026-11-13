import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { seatPoint } from '../domain/seats';
import { footprint } from '../domain/placement';
import { visualPiecePoint } from './furniture-scale';
import { seatAt } from './furniture-targets';
import { standingSpot } from './walking-path';
import { createPlayGesture } from './play-gesture';
import type { Action, Piece, World } from '../domain/types';

/** The living room with a free chair (id 20) on the floor, away from the sofa. */
function withChair(): World {
  const world = initialWorld(), chair: Piece = { id: 20, kind: 'chair', room: 'sala', x: 600, y: 400, color: 'original', flipped: false };
  return { ...world, layout: { ...world.layout, pieces: [...world.layout.pieces, chair], nextId: 21 } };
}
const bia = (world: World) => world.actors.find(a => a.id === 'bia')!;
const chairSeat = (world: World) => visualPiecePoint(world.layout.pieces.find(p => p.id === 20)!, seatPoint(world, '20.0')!);

it('ímã de assento (W3L-17): uma vaga livre a até 60 px dos pés de quem é solto a puxa; mais longe, ocupada ou sem quem, não', () => {
  const world = withChair(), seat = chairSeat(world);
  expect(seatAt(world, { x: seat.x + 50, y: seat.y }, bia(world))).toBe('20.0');
  expect(seatAt(world, { x: seat.x + 42, y: seat.y + 40 }, bia(world))).toBe('20.0');
  expect(seatAt(world, { x: seat.x + 50, y: seat.y })).toBeUndefined();
  expect(seatAt(world, { x: seat.x + 61, y: seat.y }, bia(world))).toBeUndefined();
  const taken = transition(world, { type: 'sit', actor: 'luna', seat: '20.0' }).state;
  expect(seatAt(taken, { x: seat.x + 50, y: seat.y }, bia(taken))).toBeUndefined();
  expect(seatAt(taken, { x: seat.x + 10, y: seat.y }, bia(taken))).toBe('20.0');
});

it('ninguém fica em pé dentro de móvel sólido: solto sobre a mesa, fica no lado livre mais perto', () => {
  const world = initialWorld(), table = world.layout.pieces.find(p => p.kind === 'table')!, area = footprint(table)!;
  const middle = { x: (area.left + area.right) / 2, y: (area.top + area.bottom) / 2 }, spot = standingSpot(world, middle);
  expect(spot.x < area.left - 26 || spot.x > area.right + 26 || spot.y < area.top - 15 || spot.y > area.bottom + 26).toBe(true);
  expect(standingSpot(world, { x: 800, y: 500 })).toEqual({ x: 800, y: 500 });
});

it('soltar a Bia sobre a mesa a deixa ao lado, e 50 px ao lado da cadeira livre a senta', () => {
  const run = (world: World, to: { x: number; y: number }) => {
    const sent: Action[] = [], moves: { x: number; y: number }[] = [], who = bia(world);
    const gesture = createPlayGesture(() => world, () => {}, p => moves.push(p), { dispatch: a => sent.push(a), wardrobe: () => false, toggleWardrobe: () => {}, preview: () => {} });
    gesture.start(1, { x: who.x, y: who.y - 2 }); gesture.update(1, { x: to.x, y: to.y - 2 }); gesture.end(1, { x: to.x, y: to.y - 2 });
    return { sent, moves };
  };
  const world = withChair(), seat = chairSeat(world);
  expect(run(world, { x: seat.x + 50, y: seat.y }).sent).toEqual([{ type: 'sit', actor: 'bia', seat: '20.0' }]);
  const table = world.layout.pieces.find(p => p.kind === 'table')!, area = footprint(table)!;
  const { moves } = run(world, { x: (area.left + area.right) / 2, y: area.top + 20 });
  expect(moves).toHaveLength(1);
  expect(moves[0]!.x < area.left || moves[0]!.x > area.right || moves[0]!.y < area.top || moves[0]!.y > area.bottom).toBe(true);
});
