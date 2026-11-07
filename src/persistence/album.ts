import type { Album, House } from '../domain/types';
import { validWorld } from './validation';
import { positiveId, record } from './values';
export function encodeAlbum(album: Album): string { return JSON.stringify({ version: 1, album }); }
function house(value: unknown): value is House {
  return record(value) && positiveId(value.id) && typeof value.name === 'string'
    && value.name.trim().length > 0 && value.name.length <= 48 && validWorld(value.state);
}
export function decodeAlbum(raw: string | null): Album | null {
  try {
    const envelope: unknown = JSON.parse(raw ?? 'null');
    if (!record(envelope) || envelope.version !== 1) return null;
    return validAlbum(envelope.album) ? envelope.album : null;
  } catch { return null; }
}
function validAlbum(value: unknown): value is Album {
  if (!record(value) || !positiveId(value.active) || !Array.isArray(value.houses)) return false;
  if (!value.houses.every(house)) return false;
  const ids = value.houses.map(h => h.id);
  return ids.includes(value.active) && new Set(ids).size === ids.length;
}
