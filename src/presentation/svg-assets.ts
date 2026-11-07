import { outfitLayer } from './outfit';
import { loadPieces } from './piece-assets';
import { svgFragment } from './svg-source';
import type Phaser from 'phaser';
import { actors, looks } from '../content/catalog';
import { actorIds, lookIds } from '../domain/types';
import type { ActorId } from '../domain/types';
import human from './assets/human.svg?raw';
import cat from './assets/cat.svg?raw';

export const roomLayers = ['wardrobe-closed', 'wardrobe-open', 'drawer-closed', 'drawer-open', 'fridge-closed', 'fridge-open', 'lamp-on', 'lamp-off'] as const;
export const humanLayers = ['hair-back', 'legs', 'hands', 'face', 'eyes', 'lids', 'mouth', 'mouth-happy'] as const;
export const catLayers = ['tail', 'body', 'eyes', 'lids'] as const;

function color(value: number) { return `#${value.toString(16).padStart(6, '0')}`; }
const layer = (source: string, id: string) => svgFragment(source, [id]);
function loadActor(scene: Phaser.Scene, id: ActorId, index: number) {
  const palette = actors[id];
  if (index >= 4) {
    const source = cat.replaceAll('#E9A35E', color(palette.skin)).replaceAll('#B57940', color(palette.hair));
    catLayers.forEach(part => scene.load.svg(`${id}-${part}`, layer(source, part)));
    return;
  }
  const source = human.replaceAll('#D79B70', color(palette.skin)).replaceAll('#F5BF38', color(palette.hair));
  humanLayers.forEach(part => scene.load.svg(`${id}-${part}`, layer(source, part === 'hair-back' && index > 1 ? 'hair-back-short' : part)));
  scene.load.svg(`${id}-hair`, layer(source, `hair-${id}`));
  lookIds.forEach(look => {
    const outfit = source.replaceAll('#E889A1', color(looks[look].color)).replace('href="#pattern-sol"', `href="#pattern-${look}"`);
    scene.load.svg(`${id}-${look}`, layer(outfit, outfitLayer(look, index > 1)));
  });
}
export function loadArt(scene: Phaser.Scene) {
  loadPieces(scene);
  actorIds.forEach((id, index) => loadActor(scene, id, index));
  lookIds.forEach(look => {
    const source = human.replaceAll('#E889A1', color(looks[look].color)).replace('href="#pattern-sol"', `href="#pattern-${look}"`);
    const garment = source.replace('viewBox="0 0 140 220"', 'viewBox="20 110 100 85"').replace('width="140" height="220"', 'width="100" height="85"');
    scene.load.svg(`look-${look}`, layer(garment, outfitLayer(look)));
  });
}
