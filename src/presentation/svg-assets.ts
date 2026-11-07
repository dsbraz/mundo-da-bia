import type Phaser from 'phaser';
import { actors, looks } from '../content/catalog';
import { actorIds, lookIds } from '../domain/types';
import type { ActorId } from '../domain/types';
import sala from './assets/sala.svg?raw';
import quarto from './assets/quarto.svg?raw';
import human from './assets/human.svg?raw';
import cat from './assets/cat.svg?raw';

export const roomLayers = ['wardrobe-closed', 'wardrobe-open', 'drawer-closed', 'drawer-open', 'fridge-closed', 'fridge-open', 'lamp-on', 'lamp-off'] as const;
export const humanLayers = ['hair-back', 'legs', 'hands', 'face', 'eyes', 'lids', 'mouth', 'mouth-happy'] as const;
export const catLayers = ['tail', 'body', 'eyes', 'lids'] as const;

function color(value: number) { return `#${value.toString(16).padStart(6, '0')}`; }
function layer(source: string, id: string): string {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  const part = document.getElementById(id);
  if (!part) throw new Error(`Camada SVG ausente: ${id}`);
  const svg = document.documentElement.cloneNode(false) as Element;
  const definitions = document.querySelector('defs');
  if (definitions) svg.append(definitions.cloneNode(true));
  svg.append(part.cloneNode(true));
  return `data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(svg))}`;
}
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
    scene.load.svg(`${id}-${look}`, layer(outfit, 'body'));
  });
}
export function loadArt(scene: Phaser.Scene) {
  scene.load.svg('sala', layer(sala, 'base'));
  scene.load.svg('quarto', layer(quarto, 'base'));
  roomLayers.forEach(part => scene.load.svg(part, layer(sala, part)));
  actorIds.forEach((id, index) => loadActor(scene, id, index));
  lookIds.forEach(look => {
    const source = human.replaceAll('#E889A1', color(looks[look].color)).replace('href="#pattern-sol"', `href="#pattern-${look}"`);
    const garment = source.replace('viewBox="0 0 140 220"', 'viewBox="20 110 100 85"').replace('width="140" height="220"', 'width="100" height="85"');
    scene.load.svg(`look-${look}`, layer(garment, 'body'));
  });
}
