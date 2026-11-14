import { isAdult } from '../domain/family';
import type { ActorId, LookId } from '../domain/types';
export function outfitLayer(look: string, masculine = false) {
  if (look === 'mira' && masculine) return 'body-mira-shorts';
  if (['rumi', 'mira', 'zoey'].includes(look)) return `body-${look}`;
  if (masculine && look === 'aurora') return 'body-neon';
  if (['nurse', 'police', 'detective', 'office', 'sport', 'outing', 'chef', 'doctor', 'gardener', 'builder', 'neon', 'aurora', 'denim', 'rehearsal', 'overalls', 'spiderman', 'superman'].includes(look)) return `body-${look}`;
  return masculine || ['sol', 'mar', 'jardim'].includes(look) ? 'body-casual' : 'body';
}
/** Whose everyday drawings a grown-up wears: Daniel's (`-m`), Laura's (`-y`, lot 8B) or Fabiana's (none). */
export const adultStyle = (id: ActorId) => id === 'daniel' ? '-m' : id === 'laura' ? '-y' : '';
/** A grown-up's garment (W3L-24): the work uniforms are shared, the two everyday looks are each one's own (`style`); any other look is
 *  the everyday one in that look's color. */
export function adultOutfit(look: string, style: string) {
  if (['market', 'office', 'doctor', 'firefighter', 'police'].includes(look)) return `adult-${look}`;
  return `adult-${look === 'outing' ? 'outing' : 'sol'}${style}`;
}
/** A grown-up's arms come with its garment's sleeves (lot 8B): hanging (`hands`), raised, or in a need's gesture. */
export const adultArms: Record<string, string> = { hands: 'arms', up: 'up', 'arm-belly': 'belly', 'arm-cheek': 'cheek' };
export const armParts = Object.keys(adultArms);
/** The texture of a figure's `part`: a grown-up's arms are drawn per look (their sleeves), everything else per person. */
export const partKey = (actor: { id: ActorId; look: LookId }, part: string) =>
  isAdult(actor.id) && part in adultArms ? `${actor.id}-${actor.look}-${part}` : `${actor.id}-${part}`;
