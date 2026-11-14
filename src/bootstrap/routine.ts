import { destination, placeOf, suggestion, type Destination, type Suggestion } from '../domain/routine';
import { sameLocation } from '../domain/location';
import { isAdult } from '../domain/family';
import { foodAtHome } from '../domain/larder';
import type { Phase } from '../domain/clock';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { ActorId, Point } from '../domain/types';
import { routineBubble, type Wish } from '../presentation/routine-bubble';
import { nameOf, routineLine } from '../content/feedback-text';

interface RoutineDeps {
  root: HTMLElement; town: () => Neighborhood; selected: () => ActorId; playing: () => boolean;
  phase: () => Phase; played: () => number; head: (id: ActorId) => Point | null;
  /** Opens the Map with `place` marked (the "Ir" there takes her). */
  openMap: (place: Destination, wish: Suggestion) => void;
}
/** The first suggestion waits for half a minute of play, so a session never opens with a bubble. */
export const routineDelay = 30_000;
/** The routine of the day (W3L-27): the selected child's dashed bubble, from her needs first and then the hour, only where it leads
 *  somewhere; a touch opens the Map with the place marked. Nothing of it is saved. */
export function routineWiring(deps: RoutineDeps) {
  function wish(): (Wish & { place: Destination }) | null {
    if (!deps.playing() || deps.played() < routineDelay) return null;
    const town = deps.town(), actor = town.actors.find(a => a.id === deps.selected());
    if (!actor || !sameLocation(actor.location, town.location)) return null;
    const wanted = suggestion(deps.phase(), actor, placeOf(town, actor.location), isAdult(actor.id), foodAtHome(town, actor.id)), place = wanted && destination(town, wanted, actor.location);
    return wanted && place ? { actor: actor.id, suggestion: wanted, place, label: routineLine(wanted, nameOf(actor)) } : null;
  }
  routineBubble(deps.root, { wish, head: deps.head, canvas: () => deps.root.querySelector('canvas'), go: shown => deps.openMap(shown.place, shown.suggestion) });
}
