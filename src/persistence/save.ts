import type { World } from '../domain/types';
import { initialWorld } from '../domain/world';
import { savedWorld } from './validation';

export function encode(state: World): string {
  return JSON.stringify({ version: 4, state });
}
export function decode(raw: string | null): World {
  try {
    return savedWorld(JSON.parse(raw ?? 'null') as unknown) ?? initialWorld();
  } catch {
    return initialWorld();
  }
}
