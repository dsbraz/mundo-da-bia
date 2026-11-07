import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { editWorld } from '../domain/design';
import { duplicateHouse, initialAlbum, updateHouse } from '../domain/houses';
import { decode, encode } from './save';
import { decodeAlbum, encodeAlbum } from './album';

it('migra v2 sem mudar móveis ou a brincadeira', () => {
  const current = initialWorld();
  const old = Object.fromEntries(Object.entries(current).filter(([key]) => key !== 'layout'));
  expect(decode(JSON.stringify({ version: 2, state: old }))).toEqual(current);
  expect(JSON.parse(encode(current)).version).toBe(4);
});
it('salva casas diferentes e a casa escolhida', () => {
  let album = duplicateHouse(initialAlbum(initialWorld()), true);
  album = updateHouse(album, editWorld(album.houses[1]!.state, { type: 'add', kind: 'neon' }));
  expect(decodeAlbum(encodeAlbum(album))).toEqual(album);
});
it('rejeita coleção incompleta sem apagar silenciosamente uma casa', () => {
  const album = initialAlbum(initialWorld());
  expect(decodeAlbum('{')).toBeNull();
  expect(decodeAlbum(JSON.stringify({ version: 1, album: { ...album, active: 99 } }))).toBeNull();
});

it('nomes longos continuam válidos depois de duplicar várias vezes', () => {
  let album = initialAlbum(initialWorld());
  album.houses[0]!.name = 'a'.repeat(48);
  for (let i = 0; i < 4; i++) album = duplicateHouse(album, false);
  expect(decodeAlbum(encodeAlbum(album))).toEqual(album);
});
