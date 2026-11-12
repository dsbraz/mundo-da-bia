import { dayIndex, eventOfDay, phaseAt, type Phase } from '../domain/clock';
/** The real clock, as a port the app can replace: the domain only ever gets the time through actions. */
export interface ClockPort { now(): number; today(): { y: number; m: number; d: number }; every(ms: number, fn: () => void): () => void; onVisible(fn: () => void): () => void }
export const realClock: ClockPort = {
  now: () => Date.now(),
  today: () => { const date = new Date(); return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() }; },
  every: (ms, fn) => { const id = setInterval(fn, ms); return () => clearInterval(id); },
  onVisible: fn => {
    const listener = () => { if (document.visibilityState === 'visible') fn(); };
    document.addEventListener('visibilitychange', listener); return () => document.removeEventListener('visibilitychange', listener);
  },
};
/** A `tick` with the time every 30 s of session and whenever the tab comes back into view; returns how to stop. */
export function startTicks(clock: ClockPort, tick: (now: number) => void): () => void {
  const stops = [clock.every(30_000, () => tick(clock.now())), clock.onVisible(() => tick(clock.now()))];
  return () => stops.forEach(stop => stop());
}
/** Session time in Brincar for the needs' `live` (§3.1): `mode(false)` pauses it in Criar; `take` hands over what was played since the last
 *  take (at most 60 s, so a hidden tab or days away count one minute) with the day phase at its start. */
export function playTime(clock: ClockPort) {
  const event = eventOfDay(dayIndex(clock.today()));
  let since = clock.now(), playing = true, pending = 0, session = 0;
  const settle = (now: number) => { if (playing) pending += Math.max(0, now - since); since = now; };
  return {
    mode(next: boolean) { settle(clock.now()); playing = next; },
    take(now: number): { elapsed: number; phase: Phase } {
      settle(now);
      const elapsed = Math.min(pending, 60_000), phase = phaseAt(session, event);
      pending = 0; session += elapsed;
      return { elapsed, phase };
    },
  };
}
