import { lookIds } from './types';
import type { ActorId, LookId } from './types';
/** The parents (W3L-24, §3.6) of the Bia and the whole Turma, living in "Minha casa". */
export const parentIds = ['daniel', 'fabiana'] as const satisfies readonly ActorId[];
/** The grown-ups: the parents and Laura (lot 8B), the Bia's 18-year-old sister. They dress from the grown-ups' wardrobe, work, take the
 *  briefcase in the morning and stand to teach at the lesson; nobody takes them for pupils. */
export const adultIds = [...parentIds, 'laura'] as const satisfies readonly ActorId[];
export const isAdult = (id: ActorId): boolean => (adultIds as readonly ActorId[]).includes(id);
/** A grown-up's 7 looks: 2 everyday ones and the uniform of each kind of work (market, office, consultation, firefighters, police). */
export const adultLooks = ['sol', 'outing', 'market', 'office', 'doctor', 'firefighter', 'police'] as const satisfies readonly LookId[];
/** Uniforms only grown-ups wear. */
const adultOnly: readonly LookId[] = ['market', 'firefighter'];
const childLooks = lookIds.filter(look => !adultOnly.includes(look));
/** The looks `id` can wear. */
export const wardrobeOf = (id: ActorId): readonly LookId[] => isAdult(id) ? adultLooks : childLooks;
