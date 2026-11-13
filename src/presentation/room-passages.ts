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
    else if (p.kind === 'up') stairsUp(scene.add.graphics().setDepth(stairsDepth), p.box);
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
/** Stairs climbing to the left, into a hatch lit by the floor above, with a banister. */
function stairsUp(g: Shape, d: Rect) {
  const hatch = { x: d.x, y: d.y, width: 92, height: 46 }, steps = 6, run = (d.width - 18) / steps, rise = (d.height - hatch.height) / steps;
  g.fillStyle(0xf5e8d3).fillRoundedRect(hatch.x - 6, hatch.y - 6, hatch.width + 12, hatch.height + 12, 6).fillStyle(0xfff2c8).fillRect(hatch.x, hatch.y, hatch.width, hatch.height);
  g.lineStyle(2, 0xb9a68c).strokeRoundedRect(hatch.x - 6, hatch.y - 6, hatch.width + 12, hatch.height + 12, 6);
  const bottom = d.y + d.height, right = d.x + d.width, outline: Points = [{ x: right, y: bottom }];
  for (let i = 0; i < steps; i++) outline.push({ x: right - i * run, y: bottom - (i + 1) * rise }, { x: right - (i + 1) * run, y: bottom - (i + 1) * rise });
  outline.push({ x: d.x + 18, y: bottom });
  // Attached, not cut out: a soft shadow on the wall behind the flight and on the floor at its foot.
  g.fillStyle(0x4a3c32, .16).fillPoints(outline.map(p => ({ x: p.x + 10, y: p.y + 4 })), true);
  g.fillStyle(0x4a3c32, .22).fillEllipse(d.x + d.width / 2 + 8, bottom + 6, d.width + 34, 20);
  fill(g, 0xd2a77f, outline, 0x8c6f55);
  for (let i = 1; i <= steps; i++) g.lineStyle(3, 0xf0d6b4).lineBetween(right - i * run + 2, bottom - i * rise + 2, right - (i - 1) * run - 2, bottom - i * rise + 2);
  // The handrail rises from a newel post at the foot and ends on a wall plate beside the hatch.
  const top = { x: hatch.x + hatch.width + 10, y: bottom - 70 - (right - hatch.x - hatch.width - 10) * rise / run };
  g.lineStyle(5, 0x8c6f55).lineBetween(right, bottom - 70, top.x, top.y);
  [1.5, 3].forEach(i => g.lineStyle(3, 0x8c6f55).lineBetween(right - i * run - 4, bottom - Math.ceil(i) * rise, right - i * run - 4, bottom - i * rise - 70));
  g.fillStyle(0x8c6f55).fillRect(right - 7, bottom - 76, 9, 76).fillCircle(right - 2.5, bottom - 78, 6);
  g.fillStyle(0xf5e8d3).fillCircle(top.x, top.y, 7).lineStyle(2, 0xb9a68c).strokeCircle(top.x, top.y, 7);
  g.fillStyle(0xd7c3ab).fillRect(d.x + 6, bottom - 2, d.width, 9);
}
/** A hole in the floor at the front left, with steps going down into it between two banisters. */
function stairwell(g: Shape) {
  fill(g, 0xd7c3ab, [{ x: 64, y: 510 }, { x: 236, y: 510 }, { x: 258, y: 600 }, { x: 32, y: 600 }], 0xb9a68c);
  const colors = [0x5d5048, 0x7a6656, 0x9c8068, 0xc29e7c], top = 518, bottom = 600, band = (bottom - top) / colors.length;
  const left = (y: number) => 72 - (y - top) * 32 / (bottom - top), right = (y: number) => 228 + (y - top) * 22 / (bottom - top);
  colors.forEach((color, i) => {
    const y0 = top + i * band, y1 = y0 + band;
    fill(g, color, [{ x: left(y0), y: y0 }, { x: right(y0), y: y0 }, { x: right(y1), y: y1 }, { x: left(y1), y: y1 }]);
    g.lineStyle(2, 0xf0d6b4, .8).lineBetween(left(y0), y0 + 1, right(y0), y0 + 1);
  });
  [[64, 32], [236, 258]].forEach(([back, front]) => {
    g.lineStyle(4, 0x8c6f55).lineBetween(back!, 510, back!, 470).lineBetween(front!, 600, front!, 548).lineBetween(back!, 470, front!, 548);
  });
}
