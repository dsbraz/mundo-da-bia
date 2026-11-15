/** The day's event (`dayIndex % 10`); 4 of the 10 days are calm. Not saved. */
export type TownEvent = 'calmo' | 'chuva' | 'feira' | 'aniversario' | 'carteiro' | 'piquenique' | 'estrelas';
export type Phase = 'manha' | 'tarde' | 'entardecer' | 'noite' | 'amanhecer';
const minute = 60_000;
const events: readonly TownEvent[] = ['calmo', 'chuva', 'calmo', 'feira', 'aniversario', 'calmo', 'carteiro', 'piquenique', 'calmo', 'estrelas'];
/** Days since 1970-01-01 of a local calendar date (month 1–12), with no time zone involved. */
export function dayIndex(date: { y: number; m: number; d: number }): number {
  return Math.round(Date.UTC(date.y, date.m - 1, date.d) / (24 * 60 * minute));
}
/** The game day of the session (lot 8E: twice the old 16 min, so night and bedtime do not come round all the time): morning 0–10 min,
 *  afternoon 10–20, dusk 20–23, night 23–29, dawn 29–32; on a night of stars the night lasts 12 min (a 38 min day). */
function day(event: TownEvent): [number, Phase][] {
  const night = event === 'estrelas' ? 12 : 6;
  return [[10, 'manha'], [20, 'tarde'], [23, 'entardecer'], [23 + night, 'noite'], [26 + night, 'amanhecer']];
}
const dayLength = (event: TownEvent) => day(event).at(-1)![0] * minute;
export function phaseAt(sessionMs: number, event: TownEvent): Phase {
  const t = (sessionMs % dayLength(event)) / minute;
  return day(event).find(([end]) => t < end)![1];
}
export function eventOfDay(day: number): TownEvent { return events[((day % 10) + 10) % 10]!; }
/** How long from `sessionMs` until the next morning begins (W3L-15: a night slept through); the day is longer on a night of stars. */
export function untilMorning(sessionMs: number, event: TownEvent): number {
  return dayLength(event) - sessionMs % dayLength(event);
}
