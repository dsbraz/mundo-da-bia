import type { Point } from '../domain/types';

/** A line drawn without lifting the chalk. */
export type Stroke = Point[];
/** Points along an ellipse from `a0` to `a1` degrees (0 is to the right, 90 down), every 15° or less. */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Stroke {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 15));
  return Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }; });
}
const line = (...xy: number[]): Stroke => Array.from({ length: xy.length / 2 }, (_, i) => ({ x: xy[2 * i]!, y: xy[2 * i + 1]! }));
const join = (...parts: Stroke[]): Stroke => parts.flat();
/** The chalk letters and numbers of the lessons (lot 8D), big capitals in a 6 × 10 box (y down), stroke by stroke in writing order:
 *  only what the words and sums need. */
export const glyphs: Readonly<Record<string, readonly Stroke[]>> = {
  A: [line(0, 10, 3, 0, 6, 10), line(1.1, 6.5, 4.9, 6.5)],
  B: [line(0, 10, 0, 0), join(line(0, 0, 3.4, 0), arc(3.4, 2.5, 2.4, 2.5, -90, 90), line(0, 5, 3.8, 5), arc(3.8, 7.5, 2.2, 2.5, -90, 90), line(3.8, 10, 0, 10))],
  C: [arc(3.4, 5, 3.4, 5, -40, -320)],
  E: [line(6, 0, 0, 0, 0, 10, 6, 10), line(0, 5, 4.5, 5)],
  F: [line(6, 0, 0, 0, 0, 10), line(0, 5, 4.5, 5)],
  G: [join(arc(3.2, 5, 3.2, 5, -40, -360), line(6.2, 5, 3.4, 5))],
  I: [line(1, 0, 5, 0), line(3, 0, 3, 10), line(1, 10, 5, 10)],
  L: [line(0, 0, 0, 10, 5.5, 10)],
  M: [line(0, 10, 0, 0, 3, 6, 6, 0, 6, 10)],
  O: [arc(3, 5, 3, 5, -90, -450)],
  P: [line(0, 10, 0, 0), join(line(0, 0, 3.3, 0), arc(3.3, 2.75, 2.7, 2.75, -90, 90), line(3.3, 5.5, 0, 5.5))],
  T: [line(0, 0, 6, 0), line(3, 0, 3, 10)],
  R: [line(0, 10, 0, 0), join(line(0, 0, 3.3, 0), arc(3.3, 2.75, 2.7, 2.75, -90, 90), line(3.3, 5.5, 0, 5.5)), line(2.8, 5.5, 6, 10)],
  S: [join(arc(3, 2.5, 2.8, 2.5, -15, -270), arc(3, 7.5, 3, 2.5, -90, 165))],
  U: [join(line(0, 0, 0, 7), arc(3, 7, 3, 3, 180, 0), line(6, 7, 6, 0))],
  V: [line(0, 0, 3, 10, 6, 0)],
  1: [line(1, 2.2, 3.6, 0, 3.6, 10), line(1.2, 10, 6, 10)],
  2: [join(arc(3, 3, 3, 3, 190, 380), line(0, 10, 6, 10))],
  3: [join(arc(3, 2.6, 2.7, 2.6, 200, 450), arc(3, 7.5, 3, 2.5, -90, 160))],
  4: [line(4.6, 10, 4.6, 0, 0, 7, 6, 7)],
  5: [join(line(5.6, 0, .6, 0, .3, 4.6), arc(3, 7, 3, 3, -145, 150))],
  6: [join(arc(3.2, 5, 3, 5, -60, -180), arc(3, 7.4, 3, 2.6, 180, 540))],
  7: [line(0, 0, 6, 0, 2, 10)],
  8: [arc(3, 2.5, 2.5, 2.5, 90, 450), arc(3, 7.5, 3, 2.5, -90, 270)],
  9: [join(arc(3, 3, 3, 3, 0, -360), line(6, 3, 5, 10))],
  '+': [line(3, 2.5, 3, 8.5), line(0, 5.5, 6, 5.5)],
  '=': [line(0, 3.5, 6, 3.5), line(0, 7, 6, 7)],
};
/** A glyph's strokes `height` tall with its top left at `at`. */
export function glyphStrokes(char: string, at: Point, height: number): Stroke[] {
  const glyph = glyphs[char];
  if (!glyph) throw new Error(`Letra de giz ausente: ${char}`);
  const k = height / 10;
  return glyph.map(stroke => stroke.map(p => ({ x: at.x + p.x * k, y: at.y + p.y * k })));
}
/** How wide a glyph `height` tall is, and the gap after it. */
export const glyphWidth = (height: number) => height * .6;
export const glyphGap = (height: number) => height * .32;
/** The total length of a set of strokes (the time the chalk spends on them). */
export const strokesLength = (strokes: readonly Stroke[]) => strokes.reduce((sum, s) => sum + s.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - s[i]!.x, p.y - s[i]!.y), 0), 0);
/** The first `length` of `strokes`, cut in the middle of a segment where it ends, and where the chalk is. */
export function strokesUpTo(strokes: readonly Stroke[], length: number): { strokes: Stroke[]; tip: Point | null } {
  const out: Stroke[] = [];
  let left = length, tip: Point | null = null;
  for (const stroke of strokes) {
    if (left <= 0) break;
    const drawn: Stroke = [stroke[0]!]; tip = stroke[0]!;
    for (let i = 1; i < stroke.length && left > 0; i++) {
      const a = stroke[i - 1]!, b = stroke[i]!, d = Math.hypot(b.x - a.x, b.y - a.y), f = Math.min(1, left / (d || 1));
      tip = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; drawn.push(tip); left -= d;
    }
    out.push(drawn);
  }
  return { strokes: out, tip };
}
