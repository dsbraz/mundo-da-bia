import type { ActorId, Point } from '../domain/types';
import type { Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { outdoorAt } from '../presentation/outdoor-controls';
import type { OutdoorTarget } from '../presentation/outdoor-controls';
import type { walking } from '../presentation/walking';
import { nameOf, refusal } from '../content/feedback-text';
interface Plaza {
  town: () => Neighborhood; selected: () => ActorId; walker: ReturnType<typeof walking>;
  dispatch: (action: NeighborhoodAction) => void; refuse: (text: string, point: Point, face?: ActorId) => void;
}
export function plaza(deps: Plaza) {
  const play = (actor: ActorId, target: OutdoorTarget) => deps.dispatch({ type: 'outdoor', actor, target: target.target, ...(target.building ? { building: target.building } : {}) });
  function drop(actor: ActorId, point: Point) {
    const target = outdoorAt(deps.town(), point); if (!target) return false;
    play(actor, target); return true;
  }
  function use(target: OutdoorTarget) {
    deps.walker.cancel();
    const selected = deps.selected();
    if (target.target === 'bench' || target.target === 'swing') {
      const occupant = deps.town().outdoor[target.target];
      if (occupant === selected) { leave(selected); return; }
      if (occupant && occupant !== selected) { deps.refuse(refusal('outdoor', nameOf(deps.town().actors.find(a => a.id === occupant)!)), { x: target.point.x, y: target.point.y - 60 }, occupant); return; }
    }
    deps.walker.start({ x: target.point.x, y: 510 }, () => play(selected, target));
  }
  /** The selected actor sitting on plaza equipment gets down when it (or the equipment) is tapped again. */
  function leave(actor: ActorId) {
    const outdoor = deps.town().outdoor;
    if (actor !== deps.selected() || (outdoor.bench !== actor && outdoor.swing !== actor)) return false;
    deps.dispatch({ type: 'outdoor', actor, target: 'leave' }); return true;
  }
  return { drop, use, leave };
}
