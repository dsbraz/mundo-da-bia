import type Phaser from 'phaser';
import { edges, passages, type Rect } from '../domain/passages';
import type { Layout, RoomId } from '../domain/types';
import { roomColors } from './room';
export { edges, passages, type Passage, type PassageKind, type Rect } from '../domain/passages';
/** The hole of the stairwell down, on the floor: in front of what stands against the back wall, behind everyone on the floor (depth = feet y). */
export const passageDepth = 405;
/** The flight up belongs to the stairwell's wall, where no piece ever stands (lot 8A): over the wall's pictures, under anyone. */
export const stairsDepth = 3;
type Shape = Phaser.GameObjects.Graphics;
type Points = Phaser.Types.Math.Vector2Like[];
const fill = (g: Shape, color: number, points: Points, line?: number) => {
  g.fillStyle(color).fillPoints(points, true); if (line !== undefined) g.lineStyle(2, line).strokePoints(points, true);
};
/** On the floor, over a rug, under any piece or person standing there. */
export const edgeDepth = 1.5;
/** The stairwell of the room shown (the flight up and the hole down), and a soft light at each floor edge that leads to a side room
 *  (lot 8A: no doorway between rooms; one walks off that edge). */
export function drawPassages(scene: Phaser.Scene, layout: Layout, room: RoomId) {
  const g = scene.add.graphics().setDepth(passageDepth);
  passages(layout, room).forEach(p => {
    if (p.kind === 'down') stairwell(g);
    else stairsUp(scene.add.graphics().setDepth(stairsDepth), roomColors(layout.rooms[p.room]!));
  });
  const floor = scene.add.graphics().setDepth(edgeDepth);
  edges(layout, room).forEach(e => edgeCue(floor, e.box, e.side));
}
/** A warm light growing toward the floor's edge and a white chevron pointing out of the room: "this way leads somewhere". */
function edgeCue(g: Shape, d: Rect, side: 'left' | 'right') {
  const outer = side === 'left' ? d.x : d.x + d.width, toward = side === 'left' ? 1 : -1, top = 410, bottom = d.y + d.height;
  [64, 46, 30, 16].forEach(width => g.fillStyle(0xfff1c2, .13).fillRect(side === 'left' ? outer : outer - width, top, width, bottom - top));
  const tip = { x: outer + toward * 18, y: 500 }, back = tip.x + toward * 18;
  const chevron = (color: number, alpha: number, dy: number) => g.lineStyle(8, color, alpha)
    .lineBetween(back, tip.y - 20 + dy, tip.x, tip.y + dy).lineBetween(tip.x, tip.y + dy, back, tip.y + 20 + dy);
  chevron(0x8c6f55, .25, 3); chevron(0xffffff, .85, 0);
}
/** A mix of two colors, `t` of the way from `a` to `b`. */
const mix = (a: number, b: number, t: number) => [16, 8, 0].reduce((c, shift) => c | Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t) << shift, 0);
const quad = (left: (y: number) => number, right: (y: number) => number, top: number, bottom: number): Points =>
  [{ x: left(top), y: top }, { x: right(top), y: top }, { x: right(bottom), y: bottom }, { x: left(bottom), y: bottom }];
/** The stairwell's own wall, a little in shade, and the cream corner trim where it meets the room's wall. */
function column(g: Shape) {
  g.fillStyle(0x6e655a, .1).fillRect(0, 30, 240, 362);
  g.fillStyle(0xf5e8d3).fillRect(236, 30, 10, 362).lineStyle(2, 0xb9a68c).strokeRect(236, 30, 10, 362);
}
/** A flight seen from the side, against the stairwell's wall: from the floor at the column's right it climbs to the left into an
 *  opening in the ceiling, where the room above shows (its wall and floor colours), so it always leads somewhere. Solid underneath like
 *  a dollhouse staircase, with a handrail on balusters and a newel post at its foot. */
function stairsUp(g: Shape, above: { wall: number; floor: number }) {
  column(g);
  g.fillStyle(above.wall).fillRect(8, 0, 228, 30).fillStyle(0x3b322c, .45).fillRect(8, 0, 228, 14).fillStyle(0x3b322c, .2).fillRect(8, 14, 228, 8);
  g.fillStyle(above.floor).fillRect(8, 22, 228, 8).fillStyle(0xd7c3ab).fillRect(0, 30, 246, 9).lineStyle(2, 0xb9a68c).strokeRect(0, 30, 246, 9);
  const steps = 10, foot = 236, top = 34, floor = 440, run = (foot - 26) / steps, rise = (floor - top) / steps;
  const profile: Points = [{ x: foot, y: floor }];
  for (let i = 0; i < steps; i++) profile.push({ x: foot - i * run, y: floor - (i + 1) * rise }, { x: foot - (i + 1) * run, y: floor - (i + 1) * rise });
  fill(g, 0xcda071, [...profile, { x: 26, y: floor }], 0x8c6f55);
  for (let i = 0; i < steps; i++) {
    const x = foot - (i + 1) * run, y = floor - (i + 1) * rise;
    g.fillStyle(0xecc9a1).fillRect(x, y, run + 4, 7).lineStyle(1.5, 0x8c6f55).strokeRect(x, y, run + 4, 7);
  }
  g.fillStyle(0x4a3c32, .2).fillEllipse(140, floor + 4, 250, 14);
  handrail(g, foot, floor, run, rise, steps);
}
/** The handrail follows the flight 64 above its steps, on a baluster at every other step, from the newel post at the foot. */
function handrail(g: Shape, foot: number, floor: number, run: number, rise: number, steps: number) {
  const rail = 0x8c6f55, high = 64, at = (i: number) => ({ x: foot - i * run - run / 2, y: floor - (i + 1) * rise });
  for (let i = 1; i < steps; i += 2) { const p = at(i); g.lineStyle(3, rail).lineBetween(p.x, p.y, p.x, p.y - high); }
  const start = at(0), end = at(steps - 1);
  g.lineStyle(5, rail).lineBetween(start.x + 6, start.y - high - 6, end.x, end.y - high);
  g.fillStyle(rail).fillRect(foot - 8, floor - high - 20, 10, high + 20).fillCircle(foot - 3, floor - high - 22, 7);
}
/** In the room above, the same column: a hole in the floor at its front where the flight arrives, its top steps going down into it
 *  (darker as they go), fenced by a banister with a gap on the room's side to go in. */
function stairwell(g: Shape) {
  const top = 482, bottom = 600, left = (y: number) => 40 - (y - top) * 24 / (bottom - top), right = (y: number) => 222 + (y - top) * 14 / (bottom - top);
  g.fillStyle(0x4a3c32, .18).fillEllipse(130, top - 4, 220, 16);
  fill(g, 0xd7c3ab, quad(y => left(y) - 8, y => right(y) + 8, top - 6, bottom), 0xb9a68c);
  fill(g, 0x4e433c, quad(left, right, top, bottom));
  const steps = 6, band = (bottom - top - 10) / steps;
  for (let i = 0; i < steps; i++) {
    const y0 = top + 10 + i * band, shade = 1 - i / (steps - 1);
    fill(g, mix(0xc29e7c, 0x5d5048, shade), quad(left, right, y0, y0 + band));
    g.lineStyle(2, 0xf0d6b4, .7 - shade * .5).lineBetween(left(y0), y0 + 1, right(y0), y0 + 1);
  }
  g.fillStyle(0x3b322c, .5).fillRect(left(top), top, right(top) - left(top), 10);
  const rail = 0x8c6f55, posts: [number, number][] = [[left(top) - 4, top - 2], [right(top) + 4, top - 2], [left(bottom) - 6, bottom]];
  posts.forEach(([x, y]) => g.fillStyle(rail).fillRect(x - 4, y - 46, 8, 46).fillCircle(x, y - 48, 5));
  g.lineStyle(4, rail).lineBetween(posts[0]![0], posts[0]![1] - 44, posts[1]![0], posts[1]![1] - 44).lineBetween(posts[0]![0], posts[0]![1] - 44, posts[2]![0], posts[2]![1] - 44);
  for (let t = .2; t < 1; t += .2) {
    const x = posts[0]![0] + (posts[1]![0] - posts[0]![0]) * t;
    g.lineStyle(2.5, rail).lineBetween(x, top - 2, x, top - 46);
  }
}
