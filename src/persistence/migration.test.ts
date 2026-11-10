import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { decode, encode } from './save';

it('migra a brincadeira v1 preservando roupa, posições e objetos nas mãos', () => {
  const state = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'ursinho' }).state;
  state.actors[0]!.look = 'festa';
  const legacy = {
    room: state.room, show: true,
    actors: state.actors.map(actor => Object.fromEntries(Object.entries(actor).filter(([key]) => key !== 'seat'))),
    items: state.items.map(item => Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'spot'))),
  };
  const migrated = decode(JSON.stringify({ version: 1, state: legacy }));
  expect(migrated).toEqual({ ...state, show: true, actors: state.actors.map(actor => ({ ...actor, seat: null })), items: state.items.map(item => ({ ...item, spot: 'floor' })) });
  expect(JSON.parse(encode(migrated)).version).toBe(4);
});

it('preserva luz, gaveta, conteúdo e assentos na versão nova', () => {
  let state = transition(initialWorld(), { type: 'interact', target: 'drawer' }).state;
  state = transition(state, { type: 'put', item: 'ursinho', spot: 'drawer' }).state;
  state = transition(state, { type: 'sit', actor: 'bia', seat: 'sofa-right' }).state;
  state = transition(state, { type: 'interact', target: 'lamp' }).state;
  expect(decode(encode(state))).toEqual(state);
});

it.each([
  { home: null }, { home: { lamp: 'sim', drawer: false, fridge: true } },
  { home: { lamp: true, drawer: 1, fridge: true } }, { home: { lamp: true, drawer: false, fridge: null } },
])('rejeita estado inválido dos móveis %j', patch => {
  expect(decode(JSON.stringify({ version: 4, state: { ...initialWorld(), show: true, ...patch } }))).toEqual(initialWorld());
});

it.each([
  ['seat', 'roof'], ['seat', 1], ['seat', 'bed'],
])('rejeita assento incoerente %s %s', (key, value) => {
  const state = initialWorld(); state.show = true;
  const actors = state.actors.map((actor, index) => index === 0 ? { ...actor, [key]: value } : actor);
  expect(decode(JSON.stringify({ version: 4, state: { ...state, actors } }))).toEqual(initialWorld());
});

it.each([
  { spot: 'sky' }, { spot: 'drawer', holder: 'bia' }, { spot: 'table', room: 'quarto' }, { spot: 'fridge', id: 'ursinho' },
])('rejeita localização inconsistente %j', patch => {
  const state = initialWorld(); state.show = true;
  const items = state.items.map((item, index) => index === 3 ? { ...item, ...patch } : item);
  expect(decode(JSON.stringify({ version: 4, state: { ...state, items } }))).toEqual(initialWorld());
});

it('rejeita assentos duplicados ou com posição e cômodo incompatíveis', () => {
  const state = transition(initialWorld(), { type: 'sit', actor: 'bia', seat: 'sofa-left' }).state;
  for (const patch of [{ x: 151 }, { y: 406 }, { room: 'quarto' }]) {
    const actors = state.actors.map((a, index) => index === 0 ? { ...a, ...patch } : a);
    expect(decode(JSON.stringify({ version: 4, state: { ...state, actors } }))).toEqual(initialWorld());
  }
  state.actors[1] = { ...state.actors[1]!, seat: 'sofa-left', x: 150, y: 405 };
  expect(decode(encode(state))).toEqual(initialWorld());
});

it.each([null, [], {}, { actors: [], items: [] }, { actors: [null], items: [1] }, { actors: [], items: null }])('migração também valida o save antigo %j', state => {
  expect(decode(JSON.stringify({ version: 1, state }))).toEqual(initialWorld());
});
