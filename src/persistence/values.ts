export type RecordValue = Record<string, unknown>;
export function record(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function member<T extends string>(values: readonly T[], value: unknown): value is T {
  return values.some(id => id === value);
}
export function positiveId(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0; }
export function validHome(value: unknown): boolean {
  return record(value) && typeof value.lamp === 'boolean' && typeof value.fridge === 'boolean' && typeof value.drawer === 'boolean';
}
export function roomId(value: unknown): value is import('../domain/types').RoomId {
  return typeof value === 'string' && /^(sala|quarto|room-[1-9]\d*)$/.test(value);
}
