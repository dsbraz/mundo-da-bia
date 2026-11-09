import { facadeKey, facadeSvg, roomArchitecture, svgUrl } from './architecture-art';
import type { Neighborhood } from '../domain/neighborhood-types';
import { floorCount } from '../domain/modules';
import { roomTemplates } from '../domain/types';
import { loadSvg } from './rendering';
import { outfitLayer } from './outfit';
import { loadPieces } from './piece-assets';
import { svgFragment } from './svg-source';
import type Phaser from 'phaser';
import { actors, looks } from '../content/catalog';
import { actorIds, lookIds } from '../domain/types';
import type { ActorId, LookId, World } from '../domain/types';
import human from './assets/human.svg?raw';
import cat from './assets/cat.svg?raw';

export const roomLayers = ['wardrobe-closed', 'wardrobe-open', 'drawer-closed', 'drawer-open', 'fridge-closed', 'fridge-open', 'lamp-on', 'lamp-off'] as const;
export const humanLayers = ['hair-back', 'legs', 'hands', 'face', 'eyes', 'lids', 'mouth', 'mouth-happy'] as const;
export const catLayers = ['tail', 'body', 'eyes', 'lids'] as const;

function color(value: number) { return `#${value.toString(16).padStart(6, '0')}`; }
const layer = (source: string, id: string) => svgFragment(source, [id]);
function loadActor(scene: Phaser.Scene, id: ActorId, index: number, current: LookId) {
  if (scene.textures.exists(`${id}-${current}`) || (index >= 4 && scene.textures.exists(`${id}-body`))) return;
  const palette = actors[id];
  if (index >= 4) {
    const source = cat.replaceAll('#E9A35E', color(palette.skin)).replaceAll('#B57940', color(palette.hair));
    catLayers.forEach(part => loadSvg(scene, `${id}-${part}`, layer(source, part)));
    return;
  }
  const source = human.replaceAll('#D79B70', color(palette.skin)).replaceAll('#F5BF38', color(palette.hair));
  humanLayers.forEach(part => loadSvg(scene, `${id}-${part}`, layer(source, part === 'hair-back' && index > 1 ? 'hair-back-short' : part)));
  for (const part of ['mask-spiderman', 'cape-superman']) loadSvg(scene, `${id}-${part}`, layer(source, part));
  loadSvg(scene, `${id}-hair`, layer(source, `hair-${id}`));
  [current].forEach(look => {
    const outfit = source.replaceAll('#E889A1', color(looks[look].color)).replace('href="#pattern-sol"', `href="#pattern-${look}"`);
    loadSvg(scene, `${id}-${look}`, layer(outfit, outfitLayer(look, index > 1)));
  });
}
export function loadArt(scene: Phaser.Scene, state: World, town: Neighborhood | null) {
  town?.buildings.forEach(b => { const floors = floorCount(b.layout); loadSvg(scene, facadeKey(b.model, floors), svgUrl(facadeSvg(b.model, floors))); });
  roomTemplates.filter(template => !scene.textures.exists(`architecture-${template}`)).forEach(template => loadSvg(scene, `architecture-${template}`, svgUrl(roomArchitecture(template))));
  loadPieces(scene, state);
  actorIds.forEach((id, index) => loadActor(scene, id, index, state.actors.find(a => a.id === id)!.look));
  lookIds.filter(look => !scene.textures.exists(`look-${look}`)).forEach(look => {
    const source = human.replaceAll('#E889A1', color(looks[look].color)).replace('href="#pattern-sol"', `href="#pattern-${look}"`);
    const garment = source.replace('viewBox="0 0 140 220"', 'viewBox="15 98 110 122"').replace('width="140" height="220"', 'width="110" height="122"');
    loadSvg(scene, `look-${look}`, layer(garment, outfitLayer(look)));
  });
}
