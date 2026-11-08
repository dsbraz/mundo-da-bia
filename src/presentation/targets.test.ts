import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { sourceAt } from './targets';
import { createPlayGesture } from './play-gesture';

it('um objeto na mão aparece sobre a roupa do armário e deve receber o toque', () => {
  let state = transition(initialWorld(), { type: 'move', actor: 'bia', point: { x: 392, y: 280 } }).state;
  state = transition(state, { type: 'pick', actor: 'bia', item: 'microfone' }).state;
  expect(sourceAt(state, { x: 420, y: 225 }, true)).toEqual({ kind: 'item', id: 'microfone' });
});

it('um personagem na frente do armário não deixa pegar uma roupa atrás dele', () => {
  const state = transition(initialWorld(), { type: 'move', actor: 'bia', point: { x: 340, y: 280 } }).state;
  expect(sourceAt(state, { x: 340, y: 155 }, true)).toBeUndefined();
});

it('tocar no personagem na frente da porta o seleciona em vez de abrir o armário', () => {
  const state = transition(initialWorld(), { type: 'move', actor: 'bia', point: { x: 340, y: 280 } }).state;
  let selected = ''; let toggled = false;
  const gesture = createPlayGesture(() => state, id => { selected = id; }, () => {}, {
    dispatch: () => {}, wardrobe: () => false, preview: () => {}, toggleWardrobe: () => { toggled = true; },
  });
  gesture.start(1, { x: 340, y: 170 });
  expect(selected).toBe('bia');
  expect(toggled).toBe(false);
});
it('uses the displayed pose and rendered depth when supplied by the scene', async () => {
  const { actorAt } = await import('./targets');
  const world = initialWorld();
  const state = { ...world, actorHit: (actor: typeof world.actors[number]) => actor.id === 'bia' || actor.id === 'luna',
    visibleDepth: new Map([['bia', 600], ['luna', 500]]) };
  expect(actorAt(state, { x: 20, y: 20 })?.id).toBe('bia');
});
it('a carried object does not cover the rest of the body', () => {
  const state = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'microfone' }).state;
  expect(sourceAt(state, { x: 520, y: 475 }, false)).toBeUndefined();
  expect(sourceAt(state, { x: 548, y: 475 }, false)?.id).toBe('microfone');
});
it('objetos na mesma profundidade seguem a ordem de desenho, do último para o primeiro', () => {
  const state = initialWorld();
  state.items = state.items.slice(0, 2).map(item => ({ ...item, spot: 'floor', x: 500, y: 500 }));
  expect(sourceAt(state, { x: 500, y: 472 }, false)?.id).toBe('peixe');
});
