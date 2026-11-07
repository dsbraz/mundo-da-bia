import type { World } from '../domain/types';
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
