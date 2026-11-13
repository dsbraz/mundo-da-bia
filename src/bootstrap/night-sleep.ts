import type { ActorId, PresentationEvent, World } from '../domain/types';
import type { Phase } from '../domain/clock';
import type { Neighborhood } from '../domain/neighborhood-types';
import { needsOf } from '../domain/needs';
import { seatPiece } from '../domain/seats';
import { nightFade } from '../presentation/night-fade';
import { reducedMotion } from '../presentation/motion';

interface Deps {
  root: HTMLElement; town: () => Neighborhood; state: () => World; selected: () => ActorId; phase: () => Phase;
  /** The play time jumps to the next morning and the scene's light follows. */
  morning: () => void;
  /** Whoever lies in a bed or on a sofa of `building` wakes rested (the `morning` action, only the needs change). */
  slept: (building: number) => void;
  greet: () => void;
}
/** Sleeping until morning (W3L-15, §3.5): at dusk or night, when the selected person lies down in a bed, a 3 s fade to night blue comes,
 *  the morning arrives under it (whoever lies in a bed or on a sofa of the house has slept: sleep 0) and a "bom dia". Only the child's
 *  own choice does it: a character lying down on her own never skips the night. With reduced motion the fade is 120 ms each way. */
export function nightSleep(deps: Deps) {
  const fade = nightFade(deps.root);
  let sleeping = false;
  function inBed(world: World, id: ActorId) {
    const actor = world.actors.find(a => a.id === id);
    return !!actor && actor.kind === 'human' && actor.resting && actor.room === world.room && !!actor.seat && seatPiece(world, actor.seat)?.kind === 'bed';
  }
  function mark(value: string) {
    if (!navigator.webdriver) return;
    deps.root.dataset.nightSleep = value;
    deps.root.dataset.sleep = deps.town().actors.map(a => `${a.id}:${Math.round(needsOf(a).sono)}`).join(' ');
  }
  return (events: readonly PresentationEvent[]) => {
    const id = deps.selected(), where = deps.town().location;
    if (sleeping || where.kind !== 'interior' || !['entardecer', 'noite'].includes(deps.phase())) return;
    if (!events.some(e => e.type === 'rested' && e.actor === id) || !inBed(deps.state(), id)) return;
    sleeping = true; mark('fading');
    const half = reducedMotion() ? 120 : 1500;
    fade.close(half);
    window.setTimeout(() => {
      deps.morning(); deps.slept(where.building); deps.greet(); fade.open(half); mark('morning');
      window.setTimeout(() => { sleeping = false; }, half);
    }, half);
  };
}
