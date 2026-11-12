import { seatPiece } from '../domain/seats';
import type { Actor, SeatRef, World } from '../domain/types';

/** A character as drawn: `lying` when the seat is a bed. Only presentation makes one (never saved). */
export type Posed = Actor & { lying?: true };
/** The seat the plaza's bench and swing are drawn with (they are not pieces). */
export const plazaSeat: SeatRef = '0.0';
export const lying = (actor: Actor): boolean => (actor as Posed).lying === true;
export const sitting = (actor: Actor): boolean => !!actor.seat && !lying(actor);
/** The posture of `actor` in `world`: lying on a bed, otherwise as it is. */
export function posed(world: World, actor: Actor): Posed {
  return actor.seat && seatPiece(world, actor.seat, actor.room)?.kind === 'bed' ? { ...actor, lying: true } : actor;
}
