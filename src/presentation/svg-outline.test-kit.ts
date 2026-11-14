/** Test kit (lot 8B): an SVG path's outline as polygons, and whether a point lies inside one, for the art sheets' geometry tests. */
export type P = { x: number; y: number };
type Segment = (n: number[], base: P, at: P, last: P) => { to: P; ctrl?: P };
const point = (base: P, x: number, y: number) => ({ x: base.x + x, y: base.y + y });
/** Where each path command goes (and its curve's control point), with how many numbers it takes. */
const segments: Record<string, [number, Segment]> = {
  M: [2, (n, b) => ({ to: point(b, n[0]!, n[1]!) })], L: [2, (n, b) => ({ to: point(b, n[0]!, n[1]!) })],
  H: [1, (n, b, at) => ({ to: { x: b.x + n[0]!, y: at.y } })], V: [1, (n, b, at) => ({ to: { x: at.x, y: b.y + n[0]! } })],
  Q: [4, (n, b) => ({ ctrl: point(b, n[0]!, n[1]!), to: point(b, n[2]!, n[3]!) })],
  T: [2, (n, b, at, last) => ({ ctrl: { x: 2 * at.x - last.x, y: 2 * at.y - last.y }, to: point(b, n[0]!, n[1]!) })],
};
/** A path's outline as closed polygons, each straight or curved segment sampled in eight steps. */
export function outlines(d: string): P[][] {
  const shapes: P[][] = [];
  let at: P = { x: 0, y: 0 }, open = at, last = at;
  for (const [, command, args] of d.matchAll(/([a-zA-Z])([^a-zA-Z]*)/g)) {
    const c = command!.toUpperCase(), rel = command !== c, nums = (args!.match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (c === 'Z') { at = last = open; continue; }
    const [size, segment] = segments[c]!;
    for (let k = 0; k < nums.length; k += size) {
      const { to, ctrl = { x: (at.x + to.x) / 2, y: (at.y + to.y) / 2 } } = segment(nums.slice(k, k + size), rel ? at : { x: 0, y: 0 }, at, last);
      if (c === 'M' && k === 0) { shapes.push([to]); open = to; } else shapes.at(-1)!.push(...curve(at, ctrl, to));
      last = ctrl; at = to;
    }
  }
  return shapes;
}
const curve = (from: P, ctrl: P, to: P) => Array.from({ length: 8 }, (_, s) => {
  const t = (s + 1) / 8, u = 1 - t;
  return { x: u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x, y: u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y };
});
export const inside = (p: P, polygon: P[]) => polygon.reduce((odd, a, k) => {
  const b = polygon[(k + polygon.length - 1) % polygon.length]!;
  return (a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x ? !odd : odd;
}, false);
