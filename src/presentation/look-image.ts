import { adultOutfit, outfitLayer } from './outfit';
import type { LookId } from '../domain/types';
import { svgFragment } from './svg-source';
import { adultArtReady, adultBody, lookSource } from './actor-paint';
/** A look's garment for the wardrobe; a grown-up's (W3L-24) once its sheet is read, taller. */
export function lookImage(look: LookId, masculine = false, adult = false) {
  if (adult && adultArtReady()) return svgFragment(lookSource(look, adultBody()), ['legs', adultOutfit(look, masculine)], { x: 15, y: 96, width: 110, height: 168 });
  return svgFragment(lookSource(look), ['legs', outfitLayer(look, masculine)], { x: 15, y: 98, width: 110, height: 122 });
}
