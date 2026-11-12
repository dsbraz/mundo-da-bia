import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { grabActor, itemPoint, sourceAt } from './targets';
import { createPlayGesture } from './play-gesture';

it('um objeto na mão aparece sobre a roupa do armário e deve receber o toque', () => {
  let state = transition(initialWorld(), { type: 'move', actor: 'bia', point: { x: 392, y: 410 } }).state;
  state = transition(state, { type: 'pick', actor: 'bia', item: 'microfone' }).state;
  expect(sourceAt(state, { x: 420, y: 355 }, true)).toEqual({ kind: 'item', id: 'microfone' });
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
it('a floor object saved outside the floor band is drawn resting on the floor without changing the save', () => {
  const world = initialWorld();
  world.items = world.items.map(i => i.id === 'ursinho' ? { ...i, spot: 'floor', x: 350, y: 120 } : i);
  expect(itemPoint(world, world.items.find(i => i.id === 'ursinho')!)).toEqual({ x: 350, y: 410 - 28 });
  expect(world.items.find(i => i.id === 'ursinho')!.y).toBe(120);
});
it('a cápsula de pega: um toque ao lado do braço, fora do desenho, ainda pega a personagem mais perto', () => {
  const state = initialWorld(), beside = { x: 520 + 43 + 20, y: 400 };
  expect(grabActor(state, beside)).toBeUndefined();
  expect(grabActor({ ...state, grabSlack: 28 }, beside)?.id).toBe('bia');
  expect(grabActor({ ...state, grabSlack: 28 }, { x: 520 + 43 + 30, y: 400 })).toBeUndefined();
  // Exactly drawn wins over the capsule, and between two capsules the nearest body wins.
  expect(grabActor({ ...state, grabSlack: 28 }, { x: 520, y: 400 })?.id).toBe('bia');
  expect(grabActor({ ...state, grabSlack: 60 }, { x: 476, y: 400 })?.id).toBe('bia');
});
it('um toque entre a Bia escolhida e a Pipoca, fora dos dois desenhos, fica com quem está escolhida', () => {
  // 20 screen px beside Bia's arm lands closer to Pipoca's body box; the child aimed at the one she is playing with.
  const state = { ...initialWorld(), grabSlack: 25 }, near = { x: 572, y: 435 };
  expect(grabActor(state, near)?.id).toBe('pipoca');
  expect(grabActor({ ...state, grabFirst: 'bia' }, near)?.id).toBe('bia');
  expect(grabActor({ ...state, grabFirst: 'leo' }, near)?.id).toBe('pipoca');
});
