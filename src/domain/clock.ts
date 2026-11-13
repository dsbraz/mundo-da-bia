/** The day's event (`dayIndex % 10`); 4 of the 10 days are calm. Not saved. */
export type TownEvent = 'calmo' | 'chuva' | 'feira' | 'aniversario' | 'carteiro' | 'piquenique' | 'estrelas';
export type Phase = 'manha' | 'tarde' | 'entardecer' | 'noite' | 'amanhecer';
const minute = 60_000;
const events: readonly TownEvent[] = ['calmo', 'chuva', 'calmo', 'feira', 'aniversario', 'calmo', 'carteiro', 'piquenique', 'calmo', 'estrelas'];
/** Days since 1970-01-01 of a local calendar date (month 1–12), with no time zone involved. */
export function dayIndex(date: { y: number; m: number; d: number }): number {
  return Math.round(Date.UTC(date.y, date.m - 1, date.d) / (24 * 60 * minute));
}
/** The game day of the session: morning 0–5 min, afternoon 5–10, dusk 10–11.5, night 11.5–14.5, dawn 14.5–16; on a night of stars the night lasts 6 min. */
export function phaseAt(sessionMs: number, event: TownEvent): Phase {
  const night = event === 'estrelas' ? 6 : 3;
  const ends: [number, Phase][] = [[5, 'manha'], [10, 'tarde'], [11.5, 'entardecer'], [11.5 + night, 'noite'], [13 + night, 'amanhecer']];
  const t = (sessionMs / minute) % (13 + night);
  return ends.find(([end]) => t < end)![1];
}
export function eventOfDay(day: number): TownEvent { return events[((day % 10) + 10) % 10]!; }
/** How long from `sessionMs` until the next morning begins (W3L-15: a night slept through); the day is longer on a night of stars. */
export function untilMorning(sessionMs: number, event: TownEvent): number {
  const day = (event === 'estrelas' ? 19 : 16) * minute;
  return day - sessionMs % day;
}
