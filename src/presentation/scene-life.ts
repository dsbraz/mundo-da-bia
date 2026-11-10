import type Phaser from 'phaser';
import { ambientLife } from './ambient';
import { strollFigures } from './stroll-figures';
import { trackGait } from './gait';
import type { Actor, ActorId, Point, World } from '../domain/types';

/** The scene's ambient life: idle behaviours and the walks of whoever strolls to a game or out of a doorway. */
export function sceneLife(canvas: () => HTMLCanvasElement) {
  const life = ambientLife(canvas), strolls = strollFigures(canvas);
  return {
    life, strolls,
    /** Any touch or key restarts the idle time. */
    listen() { for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, () => life.input(performance.now()), { capture: true }); },
    /** A repaint from `previous` to `state`: walks to another place end and the idle life sees the new world. */
    painted(previous: World, state: World) { strolls.leave(previous, state); life.painted(state, performance.now()); },
    /** True while the figure walks: a stroll, an idle wander or, last, a command (`commanded`). */
    walking(figure: Phaser.GameObjects.Container, actor: Actor, world: World, commanded: () => boolean) {
      return strolls.step(figure, actor, world) || life.step(figure, actor, world, performance.now()) || commanded();
    },
  };
}
/** A step of a commanded walk towards `point`: the figure faces it (dropping any gaze) and its gait counts the distance. */
export function trackSteps(figure: Phaser.GameObjects.Container | undefined, point: Point | null, gaze: Map<ActorId, number>) {
  if (!figure || !point) return;
  figure.setData('direction', Math.sign(point.x - figure.x)); gaze.delete(figure.name as ActorId);
  const distance = (figure.getData('distance') ?? 0) + Math.hypot(point.x - figure.x, point.y - figure.y);
  figure.setData('distance', distance).setData('gait', trackGait(figure.getData('gait'), performance.now(), distance));
}
