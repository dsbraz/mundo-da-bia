import { facadeKey, facadeSvg, roomArchitecture, svgUrl } from './architecture-art';
import type { Neighborhood } from '../domain/neighborhood-types';
import { floorCount } from '../domain/modules';
import { roomTemplates } from '../domain/types';
import { loadSvg } from './rendering';
import { outfitLayer } from './outfit';
import { loadPieces } from './piece-assets';
import { svgFragment } from './svg-source';
import type Phaser from 'phaser';
import { actorIds, lookIds } from '../domain/types';
import type { ActorId, LookId, World } from '../domain/types';
import { actorSource, lookSource } from './actor-paint';
import { faceParts } from './expression';

export const roomLayers = ['wardrobe-closed', 'wardrobe-open', 'drawer-closed', 'drawer-open', 'fridge-closed', 'fridge-open', 'lamp-on', 'lamp-off'] as const;
export const humanLayers = ['hair-back', 'legs', 'hands', 'face', ...faceParts.human];
export const catLayers = ['tail', 'ears', 'body', ...faceParts.cat];

const layer = (source: string, id: string) => svgFragment(source, [id]);
function loadActor(scene: Phaser.Scene, id: ActorId, index: number, current: LookId) {
  if (scene.textures.exists(`${id}-${current}`) || (index >= 4 && scene.textures.exists(`${id}-body`))) return;
  if (index >= 4) {
    const source = actorSource(id);
    catLayers.forEach(part => loadSvg(scene, `${id}-${part}`, layer(source, part)));
    return;
  }
  const source = actorSource(id);
  humanLayers.forEach(part => loadSvg(scene, `${id}-${part}`, layer(source, part === 'hair-back' && index > 1 ? 'hair-back-short' : part)));
  for (const part of ['mask-spiderman', 'cape-superman']) loadSvg(scene, `${id}-${part}`, layer(source, part));
  loadSvg(scene, `${id}-hair`, layer(source, `hair-${id}`));
  [current].forEach(look => {
    const outfit = lookSource(look, source);
    loadSvg(scene, `${id}-${look}`, layer(outfit, outfitLayer(look, index > 1)));
  });
}
export function loadArt(scene: Phaser.Scene, state: World, town: Neighborhood | null) {
  town?.buildings.forEach(b => { const floors = floorCount(b.layout); loadSvg(scene, facadeKey(b.model, floors), svgUrl(facadeSvg(b.model, floors))); });
  roomTemplates.filter(template => !scene.textures.exists(`architecture-${template}`)).forEach(template => loadSvg(scene, `architecture-${template}`, svgUrl(roomArchitecture(template))));
  loadPieces(scene, state);
  actorIds.forEach((id, index) => loadActor(scene, id, index, state.actors.find(a => a.id === id)!.look));
  lookIds.filter(look => !scene.textures.exists(`look-${look}`)).forEach(look => {
    const garment = lookSource(look).replace('viewBox="0 0 140 220"', 'viewBox="15 98 110 122"').replace('width="140" height="220"', 'width="110" height="122"');
    loadSvg(scene, `look-${look}`, layer(garment, outfitLayer(look)));
  });
}
