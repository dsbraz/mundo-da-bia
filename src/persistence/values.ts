export type RecordValue = Record<string, unknown>;
export function record(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function member<T extends string>(values: readonly T[], value: unknown): value is T {
  return values.some(id => id === value);
}
export function positiveId(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value > 0; }
