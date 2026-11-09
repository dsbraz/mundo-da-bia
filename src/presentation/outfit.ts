export function outfitLayer(look: string, masculine = false) {
  if (look === 'mira' && masculine) return 'body-mira-shorts';
  if (['rumi', 'mira', 'zoey'].includes(look)) return `body-${look}`;
  if (masculine && look === 'aurora') return 'body-neon';
  if (['nurse', 'police', 'detective', 'office', 'sport', 'outing', 'chef', 'doctor', 'gardener', 'builder', 'neon', 'aurora', 'denim', 'rehearsal', 'overalls', 'spiderman', 'superman'].includes(look)) return `body-${look}`;
  return masculine || ['sol', 'mar', 'jardim'].includes(look) ? 'body-casual' : 'body';
}
