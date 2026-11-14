import type Phaser from 'phaser';
import { passages, type Rect } from '../domain/passages';
import type { Layout, RoomId } from '../domain/types';
import { roomColors } from './room';
export { passages, type Passage, type PassageKind, type Rect } from '../domain/passages';
/** In front of the furniture against the back wall (the way through must always show), behind everyone on the floor (depth = feet y). */
export const passageDepth = 405;
/** The stairs stand out from the wall: in front of a lamp or sofa at that end too (their feet reach y 440), still behind whoever stands
 *  in front of them. */
export const stairsDepth = 441;
type Shape = Phaser.GameObjects.Graphics;
type Points = Phaser.Types.Math.Vector2Like[];
const fill = (g: Shape, color: number, points: Points, line?: number) => {
  g.fillStyle(color).fillPoints(points, true); if (line !== undefined) g.lineStyle(2, line).strokePoints(points, true);
};
/** The doorways and stairs of the room shown, in the style of its "Rua" door: a cream frame, a sage leaf with a brass knob, a sill. */
export function drawPassages(scene: Phaser.Scene, layout: Layout, room: RoomId) {
  const g = scene.add.graphics().setDepth(passageDepth);
  passages(layout, room).forEach(p => {
    if (p.kind === 'down') stairwell(g);
    else if (p.kind === 'up') stairsUp(scene.add.graphics().setDepth(stairsDepth), p.box, roomColors(layout.rooms[p.room]!));
    else doorway(g, p.box, roomColors(layout.rooms[p.room]!), p.box.x > 16 ? 'right' : 'left');
  });
}
/** A door left ajar toward the room's end: through the gap, the next room's wall and floor. */
function doorway(g: Shape, d: Rect, beyond: { wall: number; floor: number }, side: 'left' | 'right') {
  g.fillStyle(0xf5e8d3).fillRoundedRect(d.x - 9, d.y - 9, d.width + 18, d.height + 9, 8);
  g.lineStyle(2, 0xb9a68c).strokeRoundedRect(d.x - 9, d.y - 9, d.width + 18, d.height + 9, 8);
  g.fillStyle(beyond.wall).fillRect(d.x, d.y, d.width, d.height);
  g.fillStyle(beyond.floor).fillRect(d.x, d.y + d.height - 34, d.width, 34);
  g.fillStyle(0xf6f4ec).fillRect(d.x, d.y + d.height - 40, d.width, 6);
  g.fillStyle(0x6e655a, .22).fillRect(d.x, d.y, d.width, 12);
  g.fillStyle(0x6e655a, .22).fillRect(side === 'left' ? d.x + d.width - 14 : d.x, d.y, 14, d.height);
  // The leaf swings into the room on its hinge at the room's end: seen at an angle, narrower than the doorway and taller near us.
  const hinge = side === 'left' ? d.x : d.x + d.width, edge = side === 'left' ? d.x + 52 : d.x + d.width - 52;
  const leaf = [{ x: hinge, y: d.y }, { x: edge, y: d.y - 14 }, { x: edge, y: d.y + d.height + 10 }, { x: hinge, y: d.y + d.height }];
  fill(g, 0x789a9a, leaf, 0x596e6a);
  const inset = (t: number, y: number) => ({ x: hinge + (edge - hinge) * t, y: y - 14 * t });
  fill(g, 0xacc7bf, [inset(.22, d.y + 16), inset(.78, d.y + 16), inset(.78, d.y + 100), inset(.22, d.y + 100)]);
  const knob = inset(.84, d.y + 128); g.fillStyle(0xf7db94).fillCircle(knob.x, knob.y, 4.5);
  g.fillStyle(0xd7c3ab).fillRect(d.x - 12, d.y + d.height - 2, d.width + 24, 9);
}
/** A mix of two colors, `t` of the way from `a` to `b`. */
const mix = (a: number, b: number, t: number) => [16, 8, 0].reduce((c, shift) => c | Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t) << shift, 0);
const quad = (left: (y: number) => number, right: (y: number) => number, top: number, bottom: number): Points =>
  [{ x: left(top), y: top }, { x: right(top), y: top }, { x: right(bottom), y: bottom }, { x: left(bottom), y: bottom }];
/** Stairs seen from the front, rising into an opening in the back wall framed like the doorways: two steps out on the floor, then a
 *  flight going away, narrower and darker step by step, up to the landing lit by the floor above (its wall and floor colours). */
function stairsUp(g: Shape, d: Rect, above: { wall: number; floor: number }) {
  const wall = 390, landing = d.y + 52, x0 = d.x, x1 = d.x + d.width;
  g.fillStyle(0xf5e8d3).fillRoundedRect(x0 - 9, d.y - 9, d.width + 18, wall - d.y + 9, 8).lineStyle(2, 0xb9a68c).strokeRoundedRect(x0 - 9, d.y - 9, d.width + 18, wall - d.y + 9, 8);
  g.fillStyle(above.wall).fillRect(x0, d.y, d.width, landing - d.y).fillStyle(0xfff2c8, .45).fillRect(x0, d.y, d.width, landing - d.y);
  g.fillStyle(above.floor).fillRect(x0, landing - 8, d.width, 8);
  // The flight's sides narrow toward the landing; the stairwell's own walls show beside it, the far one in shade.
  const inset = (y: number) => 6 + (wall - y) * 30 / (wall - landing), left = (y: number) => x0 + inset(y), right = (y: number) => x1 - inset(y);
  fill(g, 0x9a8676, [{ x: x0, y: landing }, { x: left(landing), y: landing }, { x: left(wall), y: wall }, { x: x0, y: wall }]);
  fill(g, 0xbfae9c, [{ x: right(landing), y: landing }, { x: x1, y: landing }, { x: x1, y: wall }, { x: right(wall), y: wall }]);
  const steps = 6, ratio = .82, first = (wall - landing) * (1 - ratio) / (1 - ratio ** steps);
  let bottom = wall;
  for (let i = 0; i < steps; i++) {
    const top = bottom - first * ratio ** i, shade = i / (steps - 1);
    fill(g, mix(0xc99a70, 0x7d6450, shade), quad(left, right, top, bottom));
    fill(g, mix(0xecc9a1, 0x9c8068, shade), quad(left, right, top, top + Math.max(3, (bottom - top) * .3)));
    bottom = top;
  }
  floorSteps(g, x0, x1);
  banister(g, x1, landing, right);
}
/** The first two steps, out on the floor in front of the wall, wider than the flight, with their shadow on the floor. */
function floorSteps(g: Shape, x0: number, x1: number) {
  g.fillStyle(0x4a3c32, .2).fillEllipse((x0 + x1) / 2, 442, x1 - x0 + 50, 16);
  [[384, 398, 412, 4], [404, 418, 440, -6]].forEach(([top, edge, bottom, out]) => {
    fill(g, 0xe6c39c, [{ x: x0 - out! + 4, y: top! }, { x: x1 + out! - 4, y: top! }, { x: x1 + out!, y: edge! }, { x: x0 - out!, y: edge! }], 0x8c6f55);
    fill(g, 0xc99a70, [{ x: x0 - out!, y: edge! }, { x: x1 + out!, y: edge! }, { x: x1 + out!, y: bottom! }, { x: x0 - out!, y: bottom! }], 0x8c6f55);
  });
}
/** On the room's side a newel post stands on the first step; its handrail climbs with the flight into the opening, on balusters. */
function banister(g: Shape, x1: number, landing: number, right: (y: number) => number) {
  const foot = { x: x1 + 8, y: 418 }, end = { x: right(landing + 20) - 4, y: landing - 26 }, post = 74;
  const along = (t: number) => ({ x: foot.x + (end.x - foot.x) * t, y: foot.y - post + (end.y - foot.y + post) * t });
  [.2, .4, .6, .8].forEach(t => { const top = along(t); g.lineStyle(3 - t * 1.5, 0x8c6f55).lineBetween(top.x, top.y, top.x, top.y + post * (1 - t * .7)); });
  g.lineStyle(5, 0x8c6f55).lineBetween(foot.x, foot.y - post, end.x, end.y);
  g.fillStyle(0x8c6f55).fillRect(foot.x - 5, foot.y - post, 10, post).fillCircle(foot.x, foot.y - post - 2, 7);
}
/** A hole in the floor at the front left, steps going down into it (darker as they go), fenced by a banister with a gap to go in. */
function stairwell(g: Shape) {
  const top = 516, bottom = 600, left = (y: number) => 64 - (y - top) * 32 / (bottom - top), right = (y: number) => 236 + (y - top) * 22 / (bottom - top);
  g.fillStyle(0x4a3c32, .18).fillEllipse(148, 512, 210, 16);
  fill(g, 0xd7c3ab, quad(y => left(y) - 8, y => right(y) + 8, top - 6, bottom), 0xb9a68c);
  fill(g, 0x4e433c, quad(left, right, top, bottom));
  const steps = 5, band = (bottom - top - 10) / steps;
  for (let i = 0; i < steps; i++) {
    const y0 = top + 10 + i * band, shade = 1 - i / (steps - 1);
    fill(g, mix(0xc29e7c, 0x5d5048, shade), quad(left, right, y0, y0 + band));
    g.lineStyle(2, 0xf0d6b4, .7 - shade * .5).lineBetween(left(y0), y0 + 1, right(y0), y0 + 1);
  }
  g.fillStyle(0x3b322c, .5).fillRect(left(top), top, right(top) - left(top), 10);
  const rail = 0x8c6f55, posts: [number, number][] = [[left(top) - 4, top - 2], [right(top) + 4, top - 2], [right(bottom) + 6, bottom]];
  posts.forEach(([x, y]) => g.fillStyle(rail).fillRect(x - 4, y - 46, 8, 46).fillCircle(x, y - 48, 5));
  g.lineStyle(4, rail).lineBetween(posts[0]![0], posts[0]![1] - 44, posts[1]![0], posts[1]![1] - 44).lineBetween(posts[1]![0], posts[1]![1] - 44, posts[2]![0], posts[2]![1] - 44);
  for (let t = .2; t < 1; t += .2) {
    const x = posts[0]![0] + (posts[1]![0] - posts[0]![0]) * t;
    g.lineStyle(2.5, rail).lineBetween(x, top - 2, x, top - 46);
  }
}
