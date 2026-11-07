import { initialAlbum, activeHouse } from '../domain/houses';
import { decodeAlbum, encodeAlbum } from './album';
import type { Album, World } from '../domain/types';
import { initialWorld } from '../domain/world';
import { decode, encode } from './save';

export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
const key = 'mundo-da-bia:v1';
export function load(storage?: StoragePort): World {
  try {
    return decode((storage ?? globalThis.localStorage).getItem(key));
  } catch {
    return initialWorld();
  }
}
export function save(state: World, storage?: StoragePort): boolean {
  try {
    (storage ?? globalThis.localStorage).setItem(key, encode(state));
    return true;
  } catch {
    return false;
  }
}

export function loadAlbum(storage?: StoragePort): Album {
  try {
    const port = storage ?? globalThis.localStorage;
    return decodeAlbum(port.getItem('mundo-da-bia:houses:v1')) ?? initialAlbum(load(port));
  } catch { return initialAlbum(initialWorld()); }
}
export function saveAlbum(album: Album, storage?: StoragePort): boolean {
  try {
    const port = storage ?? globalThis.localStorage;
    port.setItem('mundo-da-bia:houses:v1', encodeAlbum(album));
    return save(activeHouse(album).state, port);
  } catch { return false; }
}
