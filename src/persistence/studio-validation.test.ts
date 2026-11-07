import { expect, it, vi } from 'vitest';
import { initialWorld } from '../domain/world';
import { initialAlbum } from '../domain/houses';
import { validLayout } from './layout-validation';
import { decodeAlbum, encodeAlbum } from './album';
import { loadAlbum, saveAlbum } from './storage';
import { encode } from './save';

it.each([null, [], {}, { pieces: [], nextId: 1, rooms: {} }])('rejeita layout incompleto %j', value => {
  expect(validLayout(value)).toBe(false);
});
it.each([
  ['id', 0], ['id', 1.5], ['id', Number.MAX_SAFE_INTEGER + 1], ['kind', 'unknown'], ['room', 'rua'],
  ['color', 'red'], ['flipped', 1], ['x', '0'], ['y', '0'], ['x', -1], ['y', 64], ['x', Infinity], ['y', NaN],
])('rejeita peça corrompida %s=%s', (key, value) => {
  const layout = initialWorld().layout;
  Object.assign(layout.pieces[0]!, { [key]: value });
  expect(validLayout(layout)).toBe(false);
});
it('valida identificadores, acabamentos e unicidade dos móveis interativos', () => {
  const layout = initialWorld().layout;
  expect(validLayout(layout)).toBe(true);
  expect(validLayout({ ...layout, nextId: 10 })).toBe(false);
  expect(validLayout({ ...layout, nextId: -1 })).toBe(false);
  expect(validLayout({ ...layout, pieces: null })).toBe(false);
  expect(validLayout({ ...layout, rooms: null })).toBe(false);
  expect(validLayout({ ...layout, rooms: { ...layout.rooms, sala: { wall: 'red', floor: 'mint' } } })).toBe(false);
  expect(validLayout({ ...layout, rooms: { ...layout.rooms, sala: { wall: 'mint', floor: 'red' } } })).toBe(false);
  expect(validLayout({ ...layout, pieces: [null] })).toBe(false);
  expect(validLayout({ ...layout, pieces: [...layout.pieces, layout.pieces[0]] })).toBe(false);
  expect(validLayout({ ...layout, nextId: 12, pieces: [...layout.pieces, { ...layout.pieces[1], id: 11 }] })).toBe(false);
  expect(validLayout({ ...layout, nextId: 12, pieces: [...layout.pieces, { ...layout.pieces[0], id: 11 }] })).toBe(true);
});
it.each([null, 'null', '{}', '{"version":3}', '{"version":1,"album":null}'])('rejeita envelope %s', raw => {
  expect(decodeAlbum(raw)).toBeNull();
});
it.each([
  { active: 0 }, { active: 1.5 }, { houses: null }, { houses: [] }, { houses: [null] },
])('rejeita coleção corrompida %j', patch => {
  const album = { ...initialAlbum(initialWorld()), ...patch };
  expect(decodeAlbum(JSON.stringify({ version: 2, album }))).toBeNull();
});
it.each([{ id: 0 }, { name: '' }, { name: '  ' }, { name: 9 }, { name: 'x'.repeat(49) }, { state: {} }])('rejeita casa corrompida %j', patch => {
  const album = initialAlbum(initialWorld());
  Object.assign(album.houses[0]!, patch);
  expect(decodeAlbum(encodeAlbum(album))).toBeNull();
});
it('rejeita casas com IDs repetidos', () => {
  const album = initialAlbum(initialWorld());
  album.houses.push(album.houses[0]!);
  expect(decodeAlbum(encodeAlbum(album))).toBeNull();
});
it('usa a coleção e migra a chave antiga quando necessário', () => {
  const album = initialAlbum(initialWorld());
  album.houses[0]!.name = 'Neon';
  const values = new Map<string, string>();
  const port = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  expect(loadAlbum(port)).toEqual(initialAlbum(initialWorld()));
  expect(saveAlbum(album, port)).toBe(true);
  expect(loadAlbum(port)).toEqual(album);
  expect(values.get('mundo-da-bia:v1')).toBe(encode(album.houses[0]!.state));
  values.set('mundo-da-bia:houses:v1', 'bad');
  const old = initialWorld(); old.actors[0]!.fed = true;
  values.set('mundo-da-bia:v1', encode(old));
  expect(loadAlbum(port)).toEqual(initialAlbum(old));
  vi.stubGlobal('localStorage', port);
  try { expect(saveAlbum(album)).toBe(true); expect(loadAlbum()).toEqual(album); }
  finally { vi.unstubAllGlobals(); }
});
it('trata armazenamento indisponível e quota excedida sem lançar', () => {
  const port = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('quota'); } };
  expect(loadAlbum(port)).toEqual(initialAlbum(initialWorld()));
  expect(saveAlbum(initialAlbum(initialWorld()), port)).toBe(false);
});
