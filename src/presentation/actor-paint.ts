import human from './assets/human.svg?raw';
import cat from './assets/cat.svg?raw';
import { outfitLayer } from './outfit';
import { actors, looks } from '../content/catalog';
import type { ActorId, LookId } from '../domain/types';

type Role = 'skin' | 'hair' | 'outfit';
/** The colors each art source uses as placeholders for a role. */
const roles: { human: Record<Role, string>; cat: Partial<Record<Role, string>> } = {
  human: { skin: '#D79B70', hair: '#F5BF38', outfit: '#E889A1' },
  cat: { skin: '#E9A35E', hair: '#B57940' },
};
const color = (value: number) => `#${value.toString(16).padStart(6, '0')}`;
export const isCat = (id: ActorId) => id === 'mimi' || id === 'nino' || id === 'pipoca';
export const masculine = (id: ActorId) => id === 'leo' || id === 'rui';

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
  const painted = paintRoles(human, 'human', colors);
  return look ? lookSource(look, painted) : painted;
}
export function portraitParts(id: ActorId, look: LookId): string[] {
  if (isCat(id)) return ['tail', 'body', 'eyes'];
  return [...(look === 'superman' ? ['cape-superman'] : []), masculine(id) ? 'hair-back-short' : 'hair-back', 'legs', 'hands', outfitLayer(look, masculine(id)), 'face', `hair-${id}`, 'brows', 'eyes', 'mouth', ...(look === 'spiderman' ? ['mask-spiderman'] : [])];
}
