import { upgradeNeighborhood } from './neighborhood-upgrade';
import { decodeNeighborhood, encodeNeighborhood } from './neighborhood';
import { migrateNeighborhood } from '../domain/neighborhood';
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

const neighborhoodKey = 'mundo-da-bia:neighborhood:v3';
const recoveryKey = `${neighborhoodKey}:recovery`;
/** Earlier envelopes, read in this order and never written again: they stay as the rollback copy for an older build. */
const olderKeys = ['mundo-da-bia:neighborhood:v2', 'mundo-da-bia:neighborhood:v1'];
export function loadNeighborhood(storage?: StoragePort): import('../domain/neighborhood-types').Neighborhood {
  try {
    const port = storage ?? globalThis.localStorage;
    const saved = decodeNeighborhood(port.getItem(neighborhoodKey));
    if (saved) return saved;
    const town = olderKeys.reduce<ReturnType<typeof decodeNeighborhood>>((found, key) => found ?? decodeNeighborhood(port.getItem(key)), null)
      ?? upgradeNeighborhood(migrateNeighborhood(loadAlbum(port)));
    saveNeighborhood(town, port); return town;
  } catch { return upgradeNeighborhood(migrateNeighborhood(loadAlbum(storage))); }
}
export function saveNeighborhood(town: import('../domain/neighborhood-types').Neighborhood, storage?: StoragePort): boolean {
  try {
    const port = storage ?? globalThis.localStorage;
    protectInvalid(port);
    port.setItem(neighborhoodKey, encodeNeighborhood(town)); return true;
  } catch { return false; }
}
function protectInvalid(port: StoragePort) {
  const previous = port.getItem(neighborhoodKey);
  if (previous === null || previous === port.getItem(recoveryKey) || decodeNeighborhood(previous)) return;
  port.setItem(recoveryKey, previous);
}

const soundKey = 'mundo-da-bia:sound';
export function loadSoundOn(storage?: StoragePort): boolean {
  try { return (storage ?? globalThis.localStorage).getItem(soundKey) !== 'off'; } catch { return true; }
}
export function saveSoundOn(on: boolean, storage?: StoragePort): boolean {
  try { (storage ?? globalThis.localStorage).setItem(soundKey, on ? 'on' : 'off'); return true; } catch { return false; }
}

const firstTouchKey = 'mundo-da-bia:first-touch';
export function loadFirstTouchSeen(storage?: StoragePort): boolean {
  try { return (storage ?? globalThis.localStorage).getItem(firstTouchKey) === 'seen'; } catch { return false; }
}
export function saveFirstTouchSeen(storage?: StoragePort): boolean {
  try { (storage ?? globalThis.localStorage).setItem(firstTouchKey, 'seen'); return true; } catch { return false; }
}
