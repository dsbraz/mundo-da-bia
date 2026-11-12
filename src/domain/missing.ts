import type { ActorId, Need, PieceKind, PresentationEvent, Transition, World } from './types';
/** A refusal that explains itself: nothing changes and the event says what was missing (who has it, which piece is not here). */
export function refuse(state: World, need: Need, actor?: ActorId, by?: ActorId, want?: PieceKind): Transition {
  return { state, events: [missingEvent(need, actor, by, want)] };
}
export function missingEvent(need: Need, actor?: ActorId, by?: ActorId, want?: PieceKind): PresentationEvent {
  return { type: 'missing', ...(actor ? { actor } : {}), need, ...(by ? { by } : {}), ...(want ? { want } : {}) };
}
