import type { ActorId } from '../domain/types';
import type { Location, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { sameLocation } from '../domain/location';
import { destinationPoint } from '../presentation/neighborhood-doors';

interface Go { town: () => Neighborhood; selected: () => ActorId; building: () => boolean; townDispatch: (action: NeighborhoodAction) => void }
/** The single "Ir" verb: in play the selected character goes along (leaving any plaza seat); in create only the view changes. */
export function goTo(deps: Go) {
  return (location: Location) => {
    if (deps.building()) { deps.townDispatch({ type: 'visit', location }); return; }
    const actor = deps.town().actors.find(a => a.id === deps.selected())!;
    if (!sameLocation(actor.location, deps.town().location)) deps.townDispatch({ type: 'visit', location: actor.location });
    deps.townDispatch({ type: 'transport', actor: actor.id, location, point: destinationPoint(deps.town(), location) });
  };
}
