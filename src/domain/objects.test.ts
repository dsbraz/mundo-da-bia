import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { decode, encode } from '../persistence/save';

it.each([['bia', 'lanche'], ['mimi', 'peixe']] as const)('oferece %s a comida %s diretamente e salva', (actor, item) => {
  const before = initialWorld();
  const result = transition(before, { type: 'give', actor, item });
  expect(result.state.actors.find(a => a.id === actor)).toMatchObject({ fed: true, resting: false });
  expect(result.state.items.find(i => i.id === item)?.holder).toBeNull();
  expect(result.events).toEqual([{ type: 'fed', actor }]);
  expect(before.actors.every(a => !a.fed)).toBe(true);
  expect(decode(encode(result.state))).toEqual(result.state);
});

it('entrega o microfone, acorda e começa o show sem alterná-lo ao entregar novamente', () => {
  const before = transition(initialWorld(), { type: 'rest', actor: 'bia' }).state;
  const result = transition(before, { type: 'give', actor: 'bia', item: 'microfone' });
  expect(result.state.show).toBe(true);
  expect(result.state.actors[0]?.resting).toBe(false);
  expect(result.state.items[2]?.holder).toBe('bia');
  expect(result.events).toEqual([{ type: 'picked', actor: 'bia' }, { type: 'show' }]);
  expect(transition(result.state, { type: 'give', actor: 'luna', item: 'microfone' }).state.show).toBe(true);
  expect(decode(encode(result.state))).toEqual(result.state);
});

it('transfere objetos entre mãos sem duplicar; gatos podem segurar sem iniciar show', () => {
  const held = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  const result = transition(held, { type: 'give', actor: 'mimi', item: 'ursinho' });
  expect(result.state.items.filter(i => i.holder === 'bia')).toHaveLength(0);
  expect(result.state.items[3]?.holder).toBe('mimi');
  expect(result.state.items).toHaveLength(4);
  expect(result.state.show).toBe(false);
  const mic = transition(initialWorld(), { type: 'give', actor: 'mimi', item: 'microfone' });
  expect(mic.state.show).toBe(false);
});

it('acorda ao comer, preserva show e não deixa comida na mão', () => {
  let state = transition(initialWorld(), { type: 'rest', actor: 'bia' }).state;
  state = transition(state, { type: 'show' }).state;
  state = transition(state, { type: 'pick', actor: 'bia', item: 'lanche' }).state;
  const result = transition(state, { type: 'give', actor: 'bia', item: 'lanche' });
  expect(result.state.actors[0]).toMatchObject({ resting: false, fed: true });
  expect(result.state.show).toBe(true);
  expect(result.state.items[0]?.holder).toBeNull();
});

it('recusa comida incompatível, mãos ocupadas e objetos ou personagens ausentes', () => {
  const before = initialWorld();
  for (const [actor, item] of [['bia', 'peixe'], ['mimi', 'lanche']] as const) {
    expect(transition(before, { type: 'give', actor, item })).toEqual({ state: before, events: [] });
  }
  const busy = transition(before, { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  expect(transition(busy, { type: 'give', actor: 'bia', item: 'microfone' }).state).toEqual(busy);
  const room = transition(before, { type: 'room', room: 'quarto' }).state;
  expect(transition(room, { type: 'give', actor: 'bia', item: 'microfone' }).state).toEqual(room);
  const gathered = transition(room, { type: 'summon' }).state;
  expect(transition(gathered, { type: 'give', actor: 'bia', item: 'microfone' }).state).toEqual(gathered);
  const missing = { ...before, items: [] };
  expect(transition(missing, { type: 'give', actor: 'bia', item: 'microfone' }).state).toEqual(missing);
});

it('solta objetos no lugar escolhido, inclusive depois de carregar para outro cômodo', () => {
  let state = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  state = transition(state, { type: 'room', room: 'quarto' }).state;
  expect(transition(state, { type: 'place', item: 'ursinho', point: { x: 400, y: 400 } }).state).toEqual(state);
  state = transition(state, { type: 'summon' }).state;
  for (const point of [{ x: 60, y: 280 }, { x: 940, y: 540 }]) {
    const result = transition(state, { type: 'place', item: 'ursinho', point });
    expect(result.state.items[3]).toEqual({ id: 'ursinho', holder: null, room: 'quarto', ...point });
    expect(result.events).toEqual([{ type: 'dropped' }]);
    expect(decode(encode(result.state))).toEqual(result.state);
  }
});

it('não perde objetos ao soltar fora da casa ou em outro cômodo', () => {
  const state = initialWorld();
  for (const point of [{ x: 59, y: 280 }, { x: 941, y: 540 }, { x: 60, y: 279 }, { x: 940, y: 541 }, { x: NaN, y: 400 }]) {
    expect(transition(state, { type: 'place', item: 'lanche', point })).toEqual({ state, events: [] });
  }
  const room = transition(state, { type: 'room', room: 'quarto' }).state;
  expect(transition(room, { type: 'place', item: 'lanche', point: { x: 400, y: 400 } }).state).toEqual(room);
  const missing = { ...state, items: [] };
  expect(transition(missing, { type: 'place', item: 'lanche', point: { x: 400, y: 400 } }).state).toEqual(missing);
});
