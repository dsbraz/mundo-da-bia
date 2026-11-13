export const reducedQuery = '(prefers-reduced-motion: reduce)';
export const reducedFadeMs = 120;
const frameMs = 1000 / 60, followPerFrame = .12;
export function reducedMotion(): boolean {
  return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(reducedQuery).matches;
}
export function followFactor(elapsedMs: number, reduced = reducedMotion()): number {
  return reduced ? 1 : 1 - (1 - followPerFrame) ** (elapsedMs / frameMs);
}
export function followElapsed(now: number, previous: number | null): number {
  return previous === null || now - previous > 100 ? frameMs : now - previous;
}
export function bubbleExit(y: number, rise: number, duration: number, reduced = reducedMotion()) {
  // The line stays legible while it rises and fades only at the end (lot 6B: a linear fade had it half gone at mid-read).
  return reduced ? { y, alpha: 0, delay: duration - reducedFadeMs, duration: reducedFadeMs } : { y: y - rise, alpha: { value: 0, ease: 'Quint.In' }, delay: 0, duration };
}
/** Gentle breathing scale for the selection star (at most 10%); constant with reduced motion. */
export function selectionPulse(time: number, reduced = reducedMotion()): number {
  return reduced ? 1 : 1 + .08 * Math.sin(time / 260);
}
