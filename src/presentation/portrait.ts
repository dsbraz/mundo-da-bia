import type { ActorId, LookId } from '../domain/types';
import { svgFragment } from './svg-source';
import { actorSource, portraitParts } from './actor-paint';
const cache = new Map<string, string>();
/** Turma card picture with the actor's current look, painted by role exactly like the scene. */
export function portrait(id: ActorId, look: LookId = 'sol') {
  const key = `${id}-${look}`;
  if (!cache.has(key)) cache.set(key, svgFragment(actorSource(id, look), portraitParts(id, look)));
  return cache.get(key)!;
}
