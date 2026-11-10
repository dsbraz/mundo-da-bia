import type { ActorId } from '../domain/types';
import type { Location, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { sameLocation } from '../domain/location';
import { destinationPoint, doorFront } from '../presentation/neighborhood-doors';
import type { walking } from '../presentation/walking';

interface DoorWalk {
  town: () => Neighborhood; selected: () => ActorId; building: () => boolean; walker: ReturnType<typeof walking>;
  dispatch: (action: NeighborhoodAction) => void; enterDoor: (id: ActorId, destination: Location, done: () => void) => void;
}
/** A tap on a door in play: the chosen character walks to it, goes in (the door opens and they fade into the doorway) and comes out
 *  on the other side. False when nobody of this place can go (Create mode or the chosen one is elsewhere): the caller just visits.
 *  A new touch while they go in (at most 240 ms) keeps them at the door. */
export function doorWalk(deps: DoorWalk, events: EventTarget = window) {
  let ticket = 0;
  events.addEventListener('pointerdown', () => { ticket++; }, { capture: true });
  return (destination: Location): boolean => {
    const town = deps.town(), id = deps.selected(), actor = town.actors.find(a => a.id === id)!;
    if (deps.building() || !sameLocation(actor.location, town.location)) return false;
    deps.walker.start(doorFront(town, destination), () => {
      const mine = ++ticket;
      deps.enterDoor(id, destination, () => {
        if (mine === ticket) deps.dispatch({ type: 'transport', actor: id, location: destination, point: destinationPoint(deps.town(), destination) });
      });
    });
    return true;
  };
}
