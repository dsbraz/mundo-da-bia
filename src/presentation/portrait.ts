import human from './assets/human.svg?raw';
import cat from './assets/cat.svg?raw';
import { actors, looks } from '../content/catalog';
import type { ActorId } from '../domain/types';
import { svgFragment } from './svg-source';
export function portrait(id: ActorId) {
  const palette = actors[id]; const color = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
  if (['mimi', 'nino', 'pipoca'].includes(id)) return svgFragment(cat.replaceAll('#E9A35E', color(palette.skin)).replaceAll('#B57940', color(palette.hair)), ['tail', 'body', 'eyes']);
  const source = human.replaceAll('#D79B70', color(palette.skin)).replaceAll('#F5BF38', color(palette.hair)).replaceAll('#E889A1', color(looks.sol.color));
  return svgFragment(source, [id === 'bia' || id === 'luna' ? 'hair-back' : 'hair-back-short', 'legs', 'hands', 'body-casual', 'face', `hair-${id}`, 'eyes', 'mouth']);
}
