import type Phaser from 'phaser';
import { adultArt, paintRoles } from './actor-paint';
import { svgFragment } from './svg-source';
import { loadSvg } from './rendering';
import type { Profession } from '../domain/staff';

/** Each professional's skin and hair (lot 7): a varied cast, none of them the parents'. */
export const staffLooks: Record<Profession, { skin: string; hair: string }> = {
  teacher: { skin: '#8d5a3b', hair: '#2e2420' }, firefighter: { skin: '#f0c8a8', hair: '#c4703a' }, police: { skin: '#6b4430', hair: '#231a18' },
  doctor: { skin: '#c68e64', hair: '#c4beb6' }, coach: { skin: '#f2cfb0', hair: '#c9542d' }, clerk: { skin: '#e8c39a', hair: '#1f1a18' },
};
/** The three drawings of a professional, all on the grown-ups' canvas: the body (with the left arm and the smiling face), the right
 *  arm resting and the right arm at work with the tool of the trade. */
export function staffParts(profession: Profession): Record<'body' | 'arm' | 'act', string[]> {
  const p = `staff-${profession}`;
  return { body: [`${p}-back`, p, 'face', `${p}-hair`, 'eyes', 'brows', 'mouth-happy', `${p}-hat`], arm: [`${p}-arm`], act: [`${p}-act`] };
}
/** The art source of `profession`: the children's head over its body (`public/art/staff.svg`), painted with its skin and hair. */
export function staffSource(sheet: string, profession: Profession) {
  return paintRoles(adultArt(sheet), 'human', staffLooks[profession]);
}
/** Queues the textures `staff-<profession>-<part>` once the sheet is read (the scene's preload reads it). */
export function loadStaffArt(scene: Phaser.Scene, profession: Profession | undefined) {
  const sheet = scene.cache.text.get('art-staff') as string | undefined;
  if (!profession || !sheet || scene.textures.exists(`staff-${profession}-act`)) return;
  const source = staffSource(sheet, profession);
  for (const [part, ids] of Object.entries(staffParts(profession))) loadSvg(scene, `staff-${profession}-${part}`, svgFragment(source, ids));
}
