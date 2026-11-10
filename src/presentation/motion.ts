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
  return reduced ? { y, alpha: 0, delay: duration - reducedFadeMs, duration: reducedFadeMs } : { y: y - rise, alpha: 0, delay: 0, duration };
}
