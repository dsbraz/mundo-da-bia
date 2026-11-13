import type { ActorId, LookId } from '../domain/types';
import { svgFragment } from './svg-source';
import { actorSource, adultArtReady, keepAdult, portraitParts } from './actor-paint';
import { isAdult } from '../domain/family';
import { sheet } from './art-sheet';
const cache = new Map<string, string>();
/** Turma card picture with the actor's current look, painted by role exactly like the scene. */
export function portrait(id: ActorId, look: LookId = 'sol') {
  // A grown-up's sheet may not be read yet: the face icon until it is, and the next refresh draws the portrait.
  if (isAdult(id) && !adultArtReady()) { void sheet('adult').then(keepAdult); return `/icons/${id}.svg`; }
  const key = `${id}-${look}`;
  if (!cache.has(key)) cache.set(key, svgFragment(actorSource(id, look), portraitParts(id, look)));
  return cache.get(key)!;
}
