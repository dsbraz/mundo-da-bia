import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { furnitureAt, seatAt, surfaceAt } from './furniture-targets';
import { itemPoint, actorAt } from './targets';
import { createPlayGesture } from './play-gesture';

it('móveis e destinos respeitam cômodo e portas', () => {
  const state = initialWorld();
  expect(furnitureAt(state, { x: 50, y: 200 })).toBe('lamp');
  expect(furnitureAt(state, { x: 700, y: 230 })).toBe('fridge');
  expect(furnitureAt(state, { x: 320, y: 375 })).toBe('drawer');
  expect(surfaceAt(state, { x: 300, y: 450 })).toBe('table');
  expect(surfaceAt(state, { x: 350, y: 370 })).toBeUndefined();
  const open = transition(state, { type: 'interact', target: 'drawer' }).state;
  expect(surfaceAt(open, { x: 350, y: 370 })).toBe('drawer');
  expect(surfaceAt(state, { x: 680, y: 320 })).toBe('fridge');
  expect(seatAt(state, { x: 150, y: 400 })).toBe('sofa-left');
  const away = transition(state, { type: 'room', room: 'quarto' }).state;
  expect(furnitureAt(away, { x: 50, y: 200 })).toBeUndefined();
  expect(surfaceAt(away, { x: 300, y: 450 })).toBeUndefined();
  expect(seatAt(away, { x: 790, y: 350 })).toBe('bed');
});

it('objeto guardado some com gaveta fechada e volta no mesmo lugar', () => {
  let state = transition(initialWorld(), { type: 'interact', target: 'drawer' }).state;
  state = transition(state, { type: 'put', item: 'ursinho', spot: 'drawer' }).state;
  expect(itemPoint(state, state.items[3]!)).toEqual({ x: 466, y: 364 });
  state = transition(state, { type: 'interact', target: 'drawer' }).state;
  expect(itemPoint(state, state.items[3]!)).toBeNull();
});

it('gestos entregam à mesa e sentam apenas ao concluir, sem sentar no cancelamento', () => {
  let state = initialWorld(); let selected = 'bia' as const;
  const gesture = createPlayGesture(() => state, id => { expect(id).toBe('bia'); selected = 'bia'; }, point => {
    state = transition(state, { type: 'move', actor: selected, point }).state;
  }, { wardrobe: () => false, toggleWardrobe: () => {}, preview: () => {}, dispatch: action => { state = transition(state, action).state; } });
  gesture.start(1, { x: 680, y: 282 }); gesture.end(1, { x: 260, y: 450 });
  expect(state.items[0]?.spot).toBe('table');
  gesture.start(1, { x: 520, y: 390 }); gesture.update(1, { x: 150, y: 405 }); gesture.cancel();
  expect(state.actors[0]?.seat).toBeNull();
  gesture.start(1, { x: 150, y: 300 }); gesture.end(1, { x: 150, y: 405 });
  expect(state.actors[0]?.seat).toBe('sofa-left');
});

it('personagem deitado pode ser pego pelo corpo na cama', () => {
  let state = transition(initialWorld(), { type: 'room', room: 'quarto' }).state;
  state = transition(state, { type: 'summon' }).state;
  state = transition(state, { type: 'sit', actor: 'bia', seat: 'bed' }).state;
  state.actors = state.actors.filter(a => a.id === 'bia');
  expect(actorAt(state, { x: 650, y: 350 })?.id).toBe('bia');
  expect(actorAt(state, { x: 790, y: 200 })).toBeUndefined();
});

it('objeto na mão acompanha o corpo deitado', () => {
  let state = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  state = transition(state, { type: 'room', room: 'quarto' }).state;
  state = transition(state, { type: 'summon' }).state;
  state = transition(state, { type: 'sit', actor: 'bia', seat: 'bed' }).state;
  expect(itemPoint(state, state.items[3]!)).toEqual({ x: 735, y: 322 });
});

it('soltar um objeto sobre o sofá não teletransporta quem o estava segurando', () => {
  let state = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  const before = { ...state.actors[0]! };
  const gesture = createPlayGesture(() => state, () => {}, () => {}, {
    wardrobe: () => false, toggleWardrobe: () => {}, preview: () => {},
    dispatch: action => { state = transition(state, action).state; },
  });
  gesture.start(1, { x: 548, y: 475 });
  gesture.end(1, { x: 150, y: 405 });
  expect(state.actors[0]).toEqual(before);
  expect(state.items[3]).toMatchObject({ holder: null, x: 150, y: 433 });
});
