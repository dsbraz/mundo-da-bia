import { roomSizes, roomTemplates, paletteIds } from '../domain/types';
import { member, positiveId, record, roomId, validHome } from './values';
export function validRooms(value: unknown, next: unknown): boolean {
  if (!record(value) || !positiveId(next)) return false;
  const keys = Object.keys(value);
  if (!keys.includes('sala') || !keys.includes('quarto') || keys.length > 12) return false;
  if (!keys.every(key => roomId(key) && (!key.startsWith('room-') || Number(key.slice(5)) < next))) return false;
  if (!Object.values(value).every(validRoom)) return false;
  const cells = Object.values(value).map(r => (r as { cell: number }).cell);
  return new Set(cells).size === cells.length;
}
function validRoom(value: unknown): boolean {
  if (!record(value) || typeof value.name !== 'string') return false;
  return value.name.trim().length > 0 && value.name.length <= 32 && member(roomSizes, value.size)
    && member(roomTemplates, value.template) && validCell(value.cell) && validHome(value.home)
    && member(paletteIds, value.wall) && member(paletteIds, value.floor);
}
function validCell(value: unknown): boolean { return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < 12; }
