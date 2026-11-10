import { outfitLayer } from './outfit';
import type { LookId } from '../domain/types';
import { svgFragment } from './svg-source';
import { lookSource } from './actor-paint';
export function lookImage(look: LookId, masculine = false) {
  return svgFragment(lookSource(look), ['legs', outfitLayer(look, masculine)], { x: 15, y: 98, width: 110, height: 122 });
}
