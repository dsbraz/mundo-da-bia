import type Phaser from 'phaser';
import { pieceBounds } from '../domain/layout';
import { seatPiece, seatPoint } from '../domain/seats';
import type { Actor, Piece, PieceKind, Point, World } from '../domain/types';
import { reducedMotion } from './motion';
import { visualPiecePoint } from './furniture-scale';
import { hex } from './palette';
import { contextScale, visualContext } from './pose';

export type Plate = 'full' | 'half' | 'empty';
/** Three bites in 2.4 s (W3L-07); with reduced motion only the full plate, then the empty one. */
export const mealDuration = 2400;
export function plateAt(t: number, reduced: boolean): Plate {
  if (reduced) return t < mealDuration / 2 ? 'full' : 'empty';
  return t < 800 ? 'full' : t < 1600 ? 'half' : 'empty';
}
/** Where a plate rests on each top, below the piece's box origin (before the drawing's own scale). */
const tops: Partial<Record<PieceKind, number>> = { table: 56, 'picnic-table': 62, desk: 66 };
/** Where the plate goes while `actor` eats: on the table she sits at (the picnic table's own top, or the table, desk or picnic table
 *  beside her chair), otherwise on her lap. */
export function plateSpot(world: World, actor: Actor): Point & { on: 'table' | 'lap' } {
  const seat = actor.seat ? seatPiece(world, actor.seat, actor.room) : undefined, point = actor.seat ? seatPoint(world, actor.seat, actor.room) : undefined;
  const table = seat && point ? tableBeside(world, seat, point) : undefined;
  if (table && point) {
    const box = pieceBounds[table.kind], left = table.x + 50, right = table.x + box.width - 50;
    const top = visualPiecePoint(table, { x: Math.max(left, Math.min(right, point.x)), y: table.y + tops[table.kind]! });
    return { ...top, on: 'table' };
  }
  const scale = contextScale(visualContext(world));
  return { x: actor.x, y: actor.y - (actor.kind === 'cat' ? 10 : 70) * scale, on: 'lap' };
}
function tableBeside(world: World, seat: Piece, point: Point): Piece | undefined {
  if (seat.kind === 'picnic-table') return seat;
  if (seat.kind !== 'chair') return undefined;
  return world.layout.pieces.filter(p => p.room === seat.room && tops[p.kind] !== undefined)
    .find(p => point.x > p.x - 90 && point.x < p.x + pieceBounds[p.kind].width + 90 && Math.abs(p.y + pieceBounds[p.kind].height - point.y) < 120);
}
/** The plate's drawing: the dish (cut lower as it is eaten) or an empty plate. */
function drawPlate(plate: Phaser.GameObjects.Image, empty: Phaser.GameObjects.Graphics, state: Plate) {
  const { width, height } = plate.frame, cut = state === 'half' ? height * .62 : 0;
  plate.setVisible(state !== 'empty').setCrop(0, cut, width, height - cut);
  empty.setVisible(state === 'empty');
}
/** The meal on screen: the eaten dish on the table or the lap, three bites, then `done` (the reaction). The dish keeps its art
 *  (`dish-<recipe>`, with the garnish when that one is loaded). Under automation the canvas tells each plate state. */
export function showMeal(scene: Phaser.Scene, world: World, actor: Actor, recipe: string, done: () => void) {
  const spot = plateSpot(world, actor), scale = contextScale(visualContext(world));
  const key = [`dish-${recipe}-fancy`, `dish-${recipe}`].find(k => scene.textures.exists(k));
  const depth = 1080, size = 62 * scale;
  const plate = scene.add.image(spot.x, spot.y, key ?? '__MISSING').setOrigin(.5, .84).setDisplaySize(size, size).setDepth(depth);
  const empty = scene.add.graphics().setPosition(spot.x, spot.y).setDepth(depth).setScale(size / 100);
  empty.fillStyle(hex('card')).fillEllipse(0, -8, 84, 22).lineStyle(3, hex('outline')).strokeEllipse(0, -8, 84, 22).lineStyle(1.5, hex('outline'), .6).strokeEllipse(0, -9, 60, 14);
  const reduced = reducedMotion(), clock = { t: 0 }, dataset = scene.game.canvas.dataset, steps: Plate[] = [];
  const place = () => {
    const state = plateAt(clock.t, reduced);
    if (steps.at(-1) === state) return;
    steps.push(state); drawPlate(plate, empty, state);
    if (navigator.webdriver) Object.assign(dataset, { meal: state, mealSteps: steps.join(' '), mealOn: spot.on, mealActor: actor.id });
  };
  place();
  scene.tweens.add({ targets: clock, t: mealDuration, duration: mealDuration, onUpdate: place, onComplete: () => {
    place(); plate.destroy(); empty.destroy(); if (navigator.webdriver) dataset.meal = 'done'; done();
  } });
}
