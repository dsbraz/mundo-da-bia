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
