export function outfitLayer(look: string, masculine = false) {
  if (look === 'mira' && masculine) return 'body-mira-shorts';
  if (['rumi', 'mira', 'zoey'].includes(look)) return `body-${look}`;
  if (masculine && look === 'aurora') return 'body-neon';
  if (['nurse', 'police', 'detective', 'office', 'sport', 'outing', 'chef', 'doctor', 'gardener', 'builder', 'neon', 'aurora', 'denim', 'rehearsal', 'overalls', 'spiderman', 'superman'].includes(look)) return `body-${look}`;
  return masculine || ['sol', 'mar', 'jardim'].includes(look) ? 'body-casual' : 'body';
}
/** A grown-up's garment (W3L-24): the work uniforms are shared, the two everyday looks are Daniel's or Fabiana's own; any other look is
 *  the everyday one in that look's color. */
export function adultOutfit(look: string, masculine: boolean) {
  if (['market', 'office', 'doctor', 'firefighter', 'police'].includes(look)) return `adult-${look}`;
  return `adult-${look === 'outing' ? 'outing' : 'sol'}${masculine ? '-m' : ''}`;
}
