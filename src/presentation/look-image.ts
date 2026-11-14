import { adultOutfit, outfitLayer } from './outfit';
import type { LookId } from '../domain/types';
import { svgFragment } from './svg-source';
import { adultArtReady, adultBody, lookSource } from './actor-paint';
/** A look's garment for the wardrobe; a grown-up's (W3L-24, `adult`: whose everyday drawings) once its sheet is read, taller, with its
 *  sleeves (lot 8B). */
export function lookImage(look: LookId, masculine = false, adult: string | null = null) {
  const garment = adult === null ? '' : adultOutfit(look, adult);
  if (garment && adultArtReady()) return svgFragment(lookSource(look, adultBody()), ['legs', garment, `${garment}-arms`], { x: 15, y: 96, width: 110, height: 168 });
  return svgFragment(lookSource(look), ['legs', outfitLayer(look, masculine)], { x: 15, y: 98, width: 110, height: 122 });
}
