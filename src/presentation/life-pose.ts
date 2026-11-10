import type Phaser from 'phaser';
import type { Actor, World } from '../domain/types';
import { breath, catTail, earTwitch, glancing, phaseOf, stretch } from './idle-life';
import { curled, poseTail } from './cat-pose';

type Container = Phaser.GameObjects.Container;
/** Layers this frame's ambient life on a posed figure and names what it shows (for the scene's `data-idle` list).
 *  `still`: standing or sitting on its own (not walking, not swinging), so it may breathe and stretch. */
export function lifePose(pose: Container, actor: Actor, time: number, reduced: boolean, still: boolean): string[] {
  const phase = phaseOf(actor.id), shown = actor.kind === 'cat' ? catLife(pose, actor, time, phase, reduced) : [];
  if (!still) return shown;
  // Curled up (its own drawing), a cat breathes but does not stretch.
  const curl = curled(actor) ? 1 : 0, air = breath(time, phase, reduced), long = actor.kind === 'cat' && !curl ? stretch(time, phase, reduced) : 0;
  pose.setScale(pose.scaleX * (1 + long), pose.scaleY * (1 + air - long));
  return [...shown, ...[['breath', air], ['stretch', long], ['curl', curl]].filter(([, on]) => on).map(([name]) => name as string)];
}
function catLife(pose: Container, actor: Actor, time: number, phase: number, reduced: boolean) {
  const tail = catTail(time, phase, actor.resting, reduced), ears = earTwitch(time, phase, reduced);
  poseTail(pose, tail);
  pose.getByName<Phaser.GameObjects.Image>('ears')?.setRotation(ears);
  return [...((tail.base || tail.tip) && !actor.resting ? ['tail'] : []), ...(ears ? ['ears'] : [])];
}
/** Which way a glance goes: toward the nearest other character in the room, or 0 when not glancing. */
export function glanceDirection(world: World, actor: Actor, time: number, reduced: boolean) {
  if (!glancing(time, phaseOf(actor.id), reduced)) return 0;
  const others = world.actors.filter(a => a.id !== actor.id && a.room === world.room).sort((a, b) => Math.abs(a.x - actor.x) - Math.abs(b.x - actor.x));
  return others[0] ? Math.sign(others[0].x - actor.x) || 1 : 0;
}
