import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { pieceBounds } from '../domain/layout';
import { seatPoint } from '../domain/seats';
import { approach, equipmentAction } from './equipment-interaction';
import { visualPiecePoint } from './furniture-scale';

it('tocar no assento ocupado ainda leva até o sofá: lá o domínio senta ao lado ou fica de pé ao lado e mostra quem está (W3L-02)', () => {
  const world = initialWorld();
  world.actors = world.actors.map(a => a.id === 'rui' ? { ...a, x: 150, y: 405, seat: '2.0' } : a);
  expect(approach(world, 'bia', { type: 'sit', actor: 'bia', seat: '2.0' })).toEqual({ x: 100, y: 485 });
});
it('o vaso sanitário: tocar nele livre senta quem está escolhido; com alguém sentado, qualquer toque no vaso dá a descarga', () => {
  const free = initialWorld();
  free.layout = { ...free.layout, pieces: [...free.layout.pieces, { id: 40, kind: 'toilet', room: 'sala', x: 500, y: 300, color: 'original', flipped: false }], nextId: 41 };
  const tank = { x: 500 + pieceBounds.toilet.width - 6, y: 310 }, bowl = visualPiecePoint(free.layout.pieces.at(-1)!, seatPoint(free, '40.0')!);
  expect(equipmentAction(free, 'luna', tank)).toEqual({ type: 'sit', actor: 'luna', seat: '40.0' });
  expect(equipmentAction(free, 'luna', bowl)).toEqual({ type: 'sit', actor: 'luna', seat: '40.0' });
  const taken = { ...free, actors: free.actors.map(a => a.id === 'bia' ? { ...a, ...seatPoint(free, '40.0')!, seat: '40.0' as const } : a) };
  expect(equipmentAction(taken, 'luna', tank)).toEqual({ type: 'use', id: 40 });
  expect(equipmentAction(taken, 'bia', bowl)).toEqual({ type: 'use', id: 40 });
});
