import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { panelButtons, panelSlots, statusBadges } from './panel';
import type { World } from '../domain/types';

const actor = (world: World, id: string) => world.actors.find(a => a.id === id)!;
const shape = (world: World, id: string) => panelButtons(world, actor(world, id)).map(b => ({ slot: b.slot, icon: b.icon }));

it('keeps the same five icon slots in the same order before and after picking up and dropping', () => {
  const start = initialWorld();
  const holding = transition(start, { type: 'pick', actor: 'bia', item: 'lanche' }).state;
  const dropped = transition(holding, { type: 'drop', actor: 'bia' }).state;
  expect(panelButtons(start, actor(start, 'bia')).map(b => b.slot)).toEqual([...panelSlots]);
  expect(shape(holding, 'bia')).toEqual(shape(start, 'bia'));
  expect(shape(dropped, 'bia')).toEqual(shape(start, 'bia'));
  expect(panelButtons(start, actor(start, 'bia')).every(b => b.icon.endsWith('.svg') && !b.label.includes(' '))).toBe(true);
});

it('dims instead of hiding: drop and eat only light up with the right food in hand', () => {
  const start = initialWorld();
  const enabled = (world: World, id: string) => Object.fromEntries(panelButtons(world, actor(world, id)).map(b => [b.slot, b.enabled]));
  expect(enabled(start, 'bia')).toEqual({ wear: true, play: true, rest: true, drop: false, eat: false });
  const snack = transition(start, { type: 'pick', actor: 'bia', item: 'lanche' }).state;
  expect(enabled(snack, 'bia')).toMatchObject({ drop: true, eat: true });
  const fish = transition(start, { type: 'pick', actor: 'bia', item: 'peixe' }).state;
  expect(enabled(fish, 'bia')).toMatchObject({ drop: true, eat: false });
  expect(enabled(start, 'mimi')).toMatchObject({ wear: false, play: true, eat: false });
  const alone = { ...start, actors: start.actors.map(a => a.kind === 'human' ? { ...a, room: 'quarto' as const } : a) };
  expect(enabled(alone, 'mimi')).toMatchObject({ play: false });
  expect(panelButtons(start, actor(start, 'mimi'))[4]!.icon).toBe('/icons/peixe.svg');
  expect(panelButtons(start, actor(start, 'bia'))[4]!.icon).toBe('/icons/lanche.svg');
});

it('rest reads as one word that matches the room and the actor', () => {
  const start = initialWorld();
  expect(panelButtons(start, actor(start, 'bia'))[2]!.label).toBe('Descansar');
  const resting = transition(start, { type: 'rest', actor: 'bia' }).state;
  expect(panelButtons(resting, actor(resting, 'bia'))[2]!.label).toBe('Acordar');
  const away = { ...start, actors: start.actors.map(a => a.id === 'bia' ? { ...a, room: 'quarto' as const } : a) };
  expect(panelButtons(away, actor(away, 'bia')).some(b => b.enabled)).toBe(false);
});

it('status becomes at most three badges with neutral, named labels', () => {
  const start = initialWorld();
  expect(statusBadges(start, actor(start, 'bia'), 'Bia')).toEqual([]);
  let world = transition(start, { type: 'pick', actor: 'bia', item: 'lanche' }).state;
  world = transition(world, { type: 'feed', actor: 'bia' }).state;
  world = transition(world, { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  world = transition(world, { type: 'rest', actor: 'bia' }).state;
  const badges = statusBadges(world, actor(world, 'bia'), 'Bia');
  expect(badges.map(b => b.label)).toEqual(['Bia está de barriga cheia', 'Bia está descansando', 'Bia está com Ursinho']);
  expect(badges.every(b => !/Pronto para/.test(b.label))).toBe(true);
});
