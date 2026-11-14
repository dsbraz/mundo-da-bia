import { loadSchoolArt } from './school-art';
import { architectureKey, buildingFacadeKey, buildingFacadeSvg, roomArchitecture, svgUrl } from './architecture-art';
import type { Neighborhood } from '../domain/neighborhood-types';
import { roomTemplates } from '../domain/types';
import { loadSvg } from './rendering';
import { outfitLayer } from './outfit';
import { loadPieces } from './piece-assets';
import { svgFragment } from './svg-source';
import { dishBox, dishOf, dishParts, itemTexture, keepDishes, sheetPart } from './art-sheet';
import type Phaser from 'phaser';
import { actorIds, lookIds } from '../domain/types';
import type { ActorId, LookId, World } from '../domain/types';
import { actorSource, adultArtReady, isCat, keepAdult, lookSource, masculine, outfitOf } from './actor-paint';
import { isAdult } from '../domain/family';
import { faceParts } from './expression';
import { loadGarden } from './plaza-garden';

export const roomLayers = ['wardrobe-closed', 'wardrobe-open', 'drawer-closed', 'drawer-open', 'fridge-closed', 'fridge-open', 'lamp-on', 'lamp-off'] as const;
export const humanLayers = ['hair-back', 'legs', 'hands', 'face', ...faceParts.human];
export const catLayers = ['tail-base', 'tail-tip', 'ears', 'body', ...faceParts.cat, 'curl'];

const layer = (source: string, id: string) => svgFragment(source, [id]);
function loadActor(scene: Phaser.Scene, id: ActorId, current: LookId) {
  const cat = isCat(id);
  if (scene.textures.exists(`${id}-${current}`) || (cat && scene.textures.exists(`${id}-body`))) return;
  // A grown-up's body (W3L-24) waits for its sheet: the scene paints once it is read.
  if (isAdult(id) && !adultReady(scene)) return;
  if (cat) {
    const source = actorSource(id);
    catLayers.forEach(part => loadSvg(scene, `${id}-${part}`, layer(source, part)));
    return;
  }
  const source = actorSource(id);
  humanLayers.forEach(part => loadSvg(scene, `${id}-${part}`, layer(source, part === 'hair-back' && masculine(id) ? 'hair-back-short' : part)));
  for (const part of ['mask-spiderman', 'cape-superman']) loadSvg(scene, `${id}-${part}`, layer(source, part));
  loadSvg(scene, `${id}-hair`, layer(source, `hair-${id}`));
  [current].forEach(look => {
    const outfit = lookSource(look, source);
    loadSvg(scene, `${id}-${look}`, layer(outfit, outfitOf(id, look)));
  });
}
/** Whether the grown-ups' sheet is read (kept for the DOM too). */
function adultReady(scene: Phaser.Scene) {
  const text = scene.cache.text.get('art-adult') as string | undefined;
  if (text && !adultArtReady()) keepAdult(text);
  return !!text;
}
export function loadArt(scene: Phaser.Scene, state: World, town: Neighborhood | null) {
  town?.buildings.forEach(b => loadSvg(scene, buildingFacadeKey(b), svgUrl(buildingFacadeSvg(b))));
  roomTemplates.filter(template => !scene.textures.exists(`architecture-${template}`)).forEach(template => loadSvg(scene, `architecture-${template}`, svgUrl(roomArchitecture(template))));
  loadStairHall(scene, state);
  loadPieces(scene, state); loadSchoolArt(scene, state, town?.progress.drawings ?? []);
  loadDishes(scene, town?.items ?? state.items);
  if (state.streetWidth) loadGarden(scene);
  actorIds.forEach(id => loadActor(scene, id, state.actors.find(a => a.id === id)!.look));
  lookIds.filter(look => !scene.textures.exists(`look-${look}`)).forEach(look => {
    const garment = lookSource(look).replace('viewBox="0 0 140 220"', 'viewBox="15 98 110 122"').replace('width="140" height="220"', 'width="110" height="122"');
    loadSvg(scene, `look-${look}`, layer(garment, outfitLayer(look)));
  });
}
/** The room's stair hall variant, when it has stairs up (loaded on demand: few rooms have one). */
function loadStairHall(scene: Phaser.Scene, state: World) {
  const hall = state.layout.rooms[state.room] && architectureKey(state);
  if (hall?.stairs && !scene.textures.exists(hall.key)) loadSvg(scene, hall.key, svgUrl(roomArchitecture(state.layout.rooms[state.room]!.template, true)));
}
/** Every dish of the neighborhood, cut from the dishes sheet (loaded in preload) with its garnish when fancy. */
function loadDishes(scene: Phaser.Scene, items: World['items']) {
  const source = scene.cache.text.get('art-dishes') as string | undefined; if (!source) return;
  keepDishes(source);
  // Runs on every paint: only dishes without a texture yet are cut from the sheet (each cut parses it).
  items.forEach(item => { const dish = dishOf(item), key = itemTexture(item); if (dish && !scene.textures.exists(key)) loadSvg(scene, key, sheetPart(source, dishParts(dish.recipe, dish.fancy), dishBox)); });
}
