import { lookIds } from './types';
import type { ActorId, LookId } from './types';
/** The two grown-ups (W3L-24, §3.6): the parents of the Bia and the whole Turma, living in "Minha casa". */
export const adultIds = ['daniel', 'fabiana'] as const satisfies readonly ActorId[];
export const isAdult = (id: ActorId): boolean => (adultIds as readonly ActorId[]).includes(id);
/** A grown-up's 7 looks: 2 everyday ones and the uniform of each kind of work (market, office, consultation, firefighters, police). */
export const adultLooks = ['sol', 'outing', 'market', 'office', 'doctor', 'firefighter', 'police'] as const satisfies readonly LookId[];
/** Uniforms only grown-ups wear. */
const adultOnly: readonly LookId[] = ['market', 'firefighter'];
const childLooks = lookIds.filter(look => !adultOnly.includes(look));
/** The looks `id` can wear. */
export const wardrobeOf = (id: ActorId): readonly LookId[] => isAdult(id) ? adultLooks : childLooks;
