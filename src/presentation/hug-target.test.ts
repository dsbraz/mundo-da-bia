import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { actorDropTarget, hugTarget } from './drop-target';
import { hugStyle } from './reactions';

it('soltar alguém com os pés junto aos de outra pessoa do cômodo é um abraço (W3L-14); longe, sozinha ou noutro cômodo, não', () => {
  const world = initialWorld();
  // Léo's feet are at (420, 530), Bia's at (520, 530).
  expect(hugTarget(world, 'bia', { x: 440, y: 520 })?.id).toBe('leo');
  expect(hugTarget(world, 'bia', { x: 520, y: 530 })).toBeUndefined();
  expect(hugTarget(world, 'bia', { x: 360, y: 450 })).toBeUndefined();
  const away = { ...world, actors: world.actors.map(a => a.id === 'leo' ? { ...a, room: 'quarto' as const } : a) };
  expect(hugTarget(away, 'bia', { x: 420, y: 530 })?.id).not.toBe('leo');
  expect(actorDropTarget(world, 'bia', { x: 425, y: 530 })).toMatchObject({ kind: 'person', actor: 'leo' });
});
it('Léo e Rui se cumprimentam com um toca-aqui; os outros pares se abraçam', () => {
  expect([hugStyle('leo', 'rui'), hugStyle('rui', 'leo'), hugStyle('bia', 'leo'), hugStyle('luna', 'mimi')]).toEqual(['five', 'five', 'hug', 'hug']);
});
