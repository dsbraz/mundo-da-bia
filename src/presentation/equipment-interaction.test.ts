import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { approach } from './equipment-interaction';

it('tocar no assento ocupado ainda leva até o sofá: lá o domínio senta ao lado ou fica de pé ao lado e mostra quem está (W3L-02)', () => {
  const world = initialWorld();
  world.actors = world.actors.map(a => a.id === 'rui' ? { ...a, x: 150, y: 405, seat: 'sofa-left' } : a);
  expect(approach(world, 'bia', { type: 'sit', actor: 'bia', seat: 'sofa-left' })).toEqual({ x: 100, y: 485 });
});
