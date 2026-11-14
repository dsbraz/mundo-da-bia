import { borrow, shelve, type Lent } from '../domain/library';
import { pieceBounds } from '../domain/layout';
import type { Neighborhood } from '../domain/neighborhood-types';
import type { Action, ActorId, Piece, Point } from '../domain/types';
import type { sceneFeedback } from './scene-feedback';

interface LibraryDeps {
  town: () => Neighborhood; selected: () => ActorId;
  /** Commits a neighborhood changed at the bookcase (saved and drawn), outside the undo history, like the market. */
  apply: (town: Neighborhood) => void;
  feedback: Pick<ReturnType<typeof sceneFeedback>, 'missing' | 'sound'>;
}
const bookcases = (town: Neighborhood): Piece[] => {
  const where = town.location;
  return where.kind === 'interior' ? town.buildings.find(b => b.id === where.building)?.layout.pieces.filter(p => p.room === where.room && p.kind === 'bookcase') ?? [] : [];
};
/** The bookcase under a let-go point (its drawing, down to the floor in front of it). */
const under = (town: Neighborhood, point: Point) => bookcases(town).find(p => point.x >= p.x && point.x <= p.x + pieceBounds.bookcase.width && point.y >= p.y && point.y <= p.y + pieceBounds.bookcase.height + 40);
/** The bookcases in play (lot 8C): a tap (once she walked there) takes a book or gives the one in hand back; a book let go over a
 *  bookcase goes back on it. */
export function libraryPlay(deps: LibraryDeps) {
  function settle(result: Lent) {
    if (result.town !== deps.town()) deps.apply(result.town);
    if (result.outcome === 'hands') deps.feedback.missing('hands', { actor: deps.selected() });
    if (result.outcome === 'took' || result.outcome === 'returned') deps.feedback.sound.cue('page');
    return true;
  }
  return {
    /** A scene action the bookcases take over: the tap on one, or a book let go over one. */
    intercept(action: Action): boolean {
      const town = deps.town();
      if (action.type === 'use' && bookcases(town).some(p => p.id === action.id)) return settle(borrow(town, deps.selected(), action.id));
      const shelf = action.type === 'place' && town.items.some(i => i.id === action.item && i.kind === 'livro') ? under(town, action.point) : undefined;
      return action.type === 'place' && !!shelf && settle(shelve(town, action.item, shelf.id));
    },
  };
}
