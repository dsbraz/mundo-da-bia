import type { Point } from '../domain/types';

/** The sleeve the hugging arm wears (lot 8 polish): its colour and outline, its width over the arm's (`adult.svg` draws a 12.4 arm in a
 *  19 sleeve) and how much of the arm it covers from the shoulder (`cut`, 0 to 1). */
export interface Sleeve { color: number; outline: number; width: number; cut: number }
const colorOf = (hex: string) => Number.parseInt(hex.slice(1), 16);
const length = (points: Point[]) => points.slice(1).reduce((sum, p, n) => sum + Math.hypot(p.x - points[n]!.x, p.y - points[n]!.y), 0);
const polyline = (d: string): Point[] => [...d.matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)].map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
/** A grown-up's sleeve, read from its hanging arms' drawing (`…-arms` of the painted sheet): the arm is the second path (its skin over its
 *  outline), the sleeve the two butt-ended strokes over it (outline, then cloth); its cut is how far down the arm the sleeve goes. */
export function adultSleeve(source: string, layer: string): Sleeve | null {
  const start = source.indexOf(`<g id="${layer}"`); if (start < 0) return null;
  const group = source.slice(start, source.indexOf('</g>', start));
  const paths = [...group.matchAll(/<path d="([^"]+)"[^>]*stroke="(#[0-9a-fA-F]{6})" stroke-width="([\d.]+)"[^>]*stroke-linecap="(round|butt)"/g)];
  const arm = paths[1], sleeve = paths.filter(p => p[4] === 'butt').slice(0, 2);
  if (!arm || sleeve.length < 2) return null;
  return { outline: colorOf(sleeve[0]![2]!), color: colorOf(sleeve[1]![2]!), width: Number(sleeve[1]![3]) / Number(arm[3]),
    cut: Math.min(1, length(polyline(sleeve[1]![1]!)) / length(polyline(arm[1]!))) };
}
/** Where a child's hanging left arm runs down its garment (canvas units of the 140 × 220 drawing, after the layers' `scale(1 1.12)`): from
 *  inside the shoulder to the wrist. Every child garment's left sleeve starts on this line; the cloth along it is the sleeve. */
export const childArmLine = { from: { x: 37, y: 116 }, to: { x: 25, y: 162 } } as const;
export const childArmSteps = 24;
/** The points of `childArmLine`, `steps` + 1 of them. */
export const childArmPoints = (steps = childArmSteps): Point[] => Array.from({ length: steps + 1 }, (_, n) => {
  const t = n / steps, { from, to } = childArmLine;
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
});
/** How much of the line the sleeve covers: up to the first point off the cloth (the garment's alpha there, 0 to 255). */
export function sleeveCut(alphas: readonly number[]): number {
  const off = alphas.findIndex(a => a < 128);
  return off < 0 ? 1 : off / Math.max(1, alphas.length - 1);
}
/** The first `fraction` of a polyline, by length (the sleeve's stretch of the hugging arm). */
export function stretch(points: readonly Point[], fraction: number): Point[] {
  let left = length([...points]) * Math.max(0, Math.min(1, fraction));
  const out = [points[0]!];
  for (let n = 1; n < points.length && left > 0; n++) {
    const a = points[n - 1]!, b = points[n]!, step = Math.hypot(b.x - a.x, b.y - a.y), t = Math.min(1, left / (step || 1));
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); left -= step;
  }
  return out;
}
