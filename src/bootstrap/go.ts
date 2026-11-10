import type { Action, ActorId } from '../domain/types';
import type { Location, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { destinationPoint } from '../presentation/neighborhood-doors';

interface Go {
  town: () => Neighborhood; selected: () => ActorId; building: () => boolean;
  townDispatch: (action: NeighborhoodAction) => void; dispatch: (action: Action) => void;
}
/** The single "Ir" verb: in play the selected character goes along; in create only the view changes. */
export function goTo(deps: Go) {
  return (location: Location) => {
    const view = deps.town().location, actor = deps.selected();
    if (deps.building()) { deps.townDispatch({ type: 'visit', location }); return; }
    if (location.kind === 'interior') {
      if (view.kind === 'street' || view.building !== location.building) deps.townDispatch({ type: 'visit', location });
      deps.dispatch({ type: 'travel', actor, room: location.room });
      return;
    }
    if (view.kind === 'street') return;
    deps.dispatch({ type: 'travel', actor, room: view.room });
    deps.townDispatch({ type: 'transport', actor, location, point: destinationPoint(deps.town(), location) });
  };
}
