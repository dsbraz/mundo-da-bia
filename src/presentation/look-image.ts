import { outfitLayer } from './outfit';
import human from './assets/human.svg?raw';
import { looks } from '../content/catalog';
import type { LookId } from '../domain/types';
import { svgFragment } from './svg-source';
export function lookImage(look: LookId, masculine = false) {
  const source = human.replaceAll('#E889A1', `#${looks[look].color.toString(16).padStart(6, '0')}`).replace('href="#pattern-sol"', `href="#pattern-${look}"`);
  const part = outfitLayer(look, masculine);
  return svgFragment(source, [part], { x: 15, y: 110, width: 110, height: 90 });
}
