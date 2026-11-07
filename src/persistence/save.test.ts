import { describe, expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { decode, encode } from './save';
import { load, save } from './storage';

describe('salvamento versionado', () => {
  it('preserva estado válido e o formato tem versão', () => {
    let state = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'lanche' }).state;
    state = transition(state, { type: 'feed', actor: 'bia' }).state;
    expect(decode(encode(state))).toEqual(state);
    expect(JSON.parse(encode(state)).version).toBe(4);
  });
  it.each([null, '', '{', 'null', '[]', '{}', '{"version":2,"state":{}}'])('recupera dados inválidos %s', raw => {
    expect(decode(raw)).toEqual(initialWorld());
  });
  it.each([
    (s: ReturnType<typeof initialWorld>) => { s.actors.pop(); },
    (s: ReturnType<typeof initialWorld>) => { s.actors[0]!.x = -1; },
    (s: ReturnType<typeof initialWorld>) => { s.actors[0]!.y = 550; },
    (s: ReturnType<typeof initialWorld>) => { s.actors[1]!.id = 'bia'; },
    (s: ReturnType<typeof initialWorld>) => { s.actors[0]!.kind = 'cat'; },
    (s: ReturnType<typeof initialWorld>) => { s.items[0]!.holder = 'bia'; s.items[1]!.holder = 'bia'; },
    (s: ReturnType<typeof initialWorld>) => { s.items.pop(); },
  ])('rejeita estado inconsistente', change => {
    const state = initialWorld(); change(state);
    expect(decode(JSON.stringify({ version: 4, state }))).toEqual(initialWorld());
  });
  it('não interrompe a brincadeira quando o armazenamento falha', () => {
    const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
    expect(load(storage)).toEqual(initialWorld());
    expect(save(initialWorld(), storage)).toBe(false);
  });
  it('usa o adaptador e informa sucesso', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(save(initialWorld(), storage)).toBe(true);
    expect(load(storage)).toEqual(initialWorld());
  });
});

it('usa o armazenamento padrão e trata o getter bloqueado', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const state = initialWorld();
  let raw: string | null = null;
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } } });
    expect(save(state)).toBe(true);
    expect(load()).toEqual(state);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    expect(save(state)).toBe(false);
    expect(load()).toEqual(initialWorld());
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

it.each([
  ['room', 'outside'], ['show', 1], ['actors', null], ['items', {}],
])('rejeita campo raiz inválido: %s', (key, value) => {
  const state = { ...initialWorld(), [key]: value };
  expect(decode(JSON.stringify({ version: 4, state }))).toEqual(initialWorld());
});

it.each([
  ['id', 'unknown'], ['room', 'outside'], ['look', 'unknown'], ['kind', 'other'],
  ['fed', 1], ['resting', null], ['x', '400'], ['y', null], ['x', 941], ['y', 279],
])('rejeita personagem inválido: %s', (key, value) => {
  const state = initialWorld();
  const actors = state.actors.map((actor, index) => index === 0 ? { ...actor, [key]: value } : actor);
  expect(decode(JSON.stringify({ version: 4, state: { ...state, actors } }))).toEqual(initialWorld());
});

it.each([
  ['id', 'unknown'], ['room', 'outside'], ['holder', 'unknown'], ['x', '400'], ['y', null],
])('rejeita objeto inválido: %s', (key, value) => {
  const state = initialWorld();
  const items = state.items.map((item, index) => index === 0 ? { ...item, [key]: value } : item);
  expect(decode(JSON.stringify({ version: 4, state: { ...state, items } }))).toEqual(initialWorld());
});
