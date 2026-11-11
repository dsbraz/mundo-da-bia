import type { ActorId, Point } from '../domain/types';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { outdoorAt } from '../presentation/outdoor-controls';
import type { OutdoorTarget } from '../presentation/outdoor-controls';
import type { walking } from '../presentation/walking';
import { nameOf, refusal } from '../content/feedback-text';
import type { gardenPlay } from './garden';
interface Plaza {
  town: () => Neighborhood; selected: () => ActorId; walker: ReturnType<typeof walking>;
  dispatch: (action: NeighborhoodAction) => void; refuse: (text: string, point: Point, face?: ActorId) => void;
  /** A push on the swing, drawn only. */
  push: (rider: ActorId) => void;
  garden: Pick<ReturnType<typeof gardenPlay>, 'touch' | 'can' | 'drop'>;
}
type Equipment = OutdoorTarget & { target: Exclude<OutdoorTarget['target'], 'plot'> };
export function plaza(deps: Plaza) {
  const play = (actor: ActorId, target: Equipment) => deps.dispatch({ type: 'outdoor', actor, target: target.target, ...(target.building ? { building: target.building } : {}) });
  function drop(actor: ActorId, point: Point) {
    const target = outdoorAt(deps.town(), point); if (!target) return false;
    if (target.target === 'plot' || target.target === 'water') deps.garden.drop(actor, target.plot ?? null); else play(actor, target as Equipment);
    return true;
  }
  function use(target: OutdoorTarget) {
    if (target.target === 'plot') { deps.garden.touch(target.plot!); return; }
    if (target.target === 'water') { deps.garden.can(); return; }
    deps.walker.cancel();
    const selected = deps.selected();
    if (target.target === 'bench' || target.target === 'swing') {
      const occupant = deps.town().outdoor[target.target];
      if (occupant === selected) { getDown(selected); return; }
      if (occupant && occupant !== selected) { deps.refuse(refusal('outdoor', nameOf(deps.town().actors.find(a => a.id === occupant)!)), { x: target.point.x, y: target.point.y - 60 }, occupant); return; }
    }
    deps.walker.start({ x: target.point.x, y: 510 }, () => play(selected, target as Equipment));
  }
  /** In the drawing, a tap on the swing its rider sits on pushes it; anything else is used as by its button. */
  function touch(target: OutdoorTarget) {
    if (target.target === 'swing' && deps.town().outdoor.swing === deps.selected()) { deps.walker.cancel(); deps.push(deps.selected()); return; }
    use(target);
  }
  /** A tap on the selected actor on plaza equipment: the swing is pushed, from the bench they get up. */
  function leave(actor: ActorId) {
    const outdoor = deps.town().outdoor;
    if (actor !== deps.selected() || (outdoor.bench !== actor && outdoor.swing !== actor)) return false;
    if (outdoor.swing === actor) deps.push(actor); else getDown(actor);
    return true;
  }
  function getDown(actor: ActorId) { deps.dispatch({ type: 'outdoor', actor, target: 'leave' }); }
  return { drop, use, touch, leave };
}
