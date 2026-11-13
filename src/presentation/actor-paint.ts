import human from './assets/human.svg?raw';
import cat from './assets/cat.svg?raw';
import { outfitLayer, adultOutfit } from './outfit';
import { isAdult } from '../domain/family';
import { actorKinds } from '../domain/types';
import { actors, looks } from '../content/catalog';
import type { ActorId, LookId } from '../domain/types';

type Role = 'skin' | 'hair' | 'outfit';
/** The colors each art source uses as placeholders for a role. */
const roles: { human: Record<Role, string>; cat: Partial<Record<Role, string>> } = {
  human: { skin: '#D79B70', hair: '#F5BF38', outfit: '#E889A1' },
  cat: { skin: '#E9A35E', hair: '#B57940' },
};
const color = (value: number) => `#${value.toString(16).padStart(6, '0')}`;
export const isCat = (id: ActorId) => actorKinds[id] === 'cat';
export const masculine = (id: ActorId) => id === 'leo' || id === 'rui' || id === 'daniel';
/** The garment layer `id` wears for `look` (a grown-up has its own drawings, W3L-24). */
export const outfitOf = (id: ActorId, look: LookId) => isAdult(id) ? adultOutfit(look, masculine(id)) : outfitLayer(look, masculine(id));

let adultSheet: string | null = null;
/** Keeps the grown-ups' drawings (`public/art/adult.svg`, read in the scene's preload or fetched by the DOM). */
export function keepAdult(text: string) { adultSheet = text; }
export const adultArtReady = () => adultSheet !== null;
/** The grown-ups' art, once the sheet is read. */
export const adultBody = () => adultArt(adultSheet!);
const childHead = /transform="translate\(8\.4 2\.4\) scale\(\.88\)"/g;
/** The children's art with the grown-ups' body in front (their layers win, same ids) and every head layer drawn smaller, on a canvas
 *  1.2× as tall: one face and one set of expressions for everybody. */
export function adultArt(sheet: string, source = human) {
  const body = sheet.slice(sheet.indexOf('<g id='), sheet.lastIndexOf('</svg>'));
  return source.replace(childHead, 'transform="translate(14 4) scale(.8)"')
    .replace('width="140" height="220" viewBox="0 0 140 220"', 'width="140" height="264" viewBox="0 0 140 264"').replace('</defs>', `</defs>${body}`);
}

/** Paints an art source by role in a single pass: each placeholder becomes its role color, when one is given. */
export function paintRoles(source: string, kind: keyof typeof roles, colors: Partial<Record<Role, string>>) {
  const byHex = new Map(Object.entries(roles[kind]).map(([role, hex]) => [hex, role as Role]));
  return source.replace(new RegExp([...byHex.keys()].join('|'), 'g'), hex => colors[byHex.get(hex)!] ?? hex);
}
export function lookSource(look: LookId, source = human) {
  return paintRoles(source, 'human', { outfit: color(looks[look].color) }).replace('href="#pattern-sol"', `href="#pattern-${look}"`);
}
export function actorSource(id: ActorId, look?: LookId) {
  const palette = actors[id], colors = { skin: color(palette.skin), hair: color(palette.hair) };
  if (isCat(id)) return paintRoles(cat, 'cat', colors);
  const painted = paintRoles(isAdult(id) && adultSheet ? adultArt(adultSheet) : human, 'human', colors);
  return look ? lookSource(look, painted) : painted;
}
export function portraitParts(id: ActorId, look: LookId): string[] {
  if (isCat(id)) return ['tail', 'ears', 'body', 'eyes'];
  return [...(look === 'superman' ? ['cape-superman'] : []), masculine(id) ? 'hair-back-short' : 'hair-back', 'legs', 'hands', outfitOf(id, look), 'face', `hair-${id}`, 'brows', 'eyes', 'mouth', ...(look === 'spiderman' ? ['mask-spiderman'] : [])];
}
