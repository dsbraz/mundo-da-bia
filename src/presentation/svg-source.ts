import type { Palette } from '../domain/types';
import { palettes } from '../content/furnishings';
export interface Crop { x: number; y: number; width: number; height: number }
export function svgFragment(source: string, ids: readonly string[], crop?: Crop): string {
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = document.documentElement.cloneNode(false) as Element;
  const definitions = document.querySelector('defs');
  if (definitions) svg.append(definitions.cloneNode(true));
  ids.forEach(id => {
    const part = document.getElementById(id);
    if (!part) throw new Error(`Camada SVG ausente: ${id}`);
    svg.append(part.cloneNode(true));
  });
  if (crop) {
    svg.setAttribute('viewBox', `${crop.x} ${crop.y} ${crop.width} ${crop.height}`);
    svg.setAttribute('width', String(crop.width)); svg.setAttribute('height', String(crop.height));
  }
  const bytes = new TextEncoder().encode(new XMLSerializer().serializeToString(svg));
  return `data:image/svg+xml;base64,${btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))}`;
}
export function recolor(source: string, color: Palette): string {
  if (color === 'original') return source;
  const palette = palettes[color];
  return source.replace(/#(a8c9b8|e7b4d8|dca2cb|91bf8e|8fbc89|aed09b|a5ca95|8ebd8c|c08abb|bc84b4|dba7d5|f196b1|c491bc)/gi, palette.base)
    .replace(/#(dce9d1|bbd99e|fff4c9|f8c387|edbddb|eec6df|ffe4ad)/gi, palette.light)
    .replace(/#(789f8b|7fb68a|bd7eb5|f7c389|eaa068|b784ae)/gi, palette.dark);
}
