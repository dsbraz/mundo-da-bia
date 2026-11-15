import { expect, it } from 'vitest';
import { actorSource, lookSource, outfitOf, portraitParts } from './actor-paint';
import { actors, looks } from '../content/catalog';
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

it('paints skin, hair and outfit by role, with the current look pattern', () => {
  const source = actorSource('luna', 'festa');
  expect(source).toContain(hex(actors.luna.skin)); expect(source).toContain(hex(actors.luna.hair)); expect(source).toContain(hex(looks.festa.color));
  expect(source).not.toMatch(/#D79B70|#F5BF38|#E889A1/); expect(source).toContain('href="#pattern-festa"');
  expect(actorSource('mimi', 'sol')).toContain(hex(actors.mimi.skin)); expect(actorSource('mimi', 'sol')).not.toMatch(/#E9A35E|#B57940/);
});
it('the portrait uses the same layers the scene draws for the current look', () => {
  expect(portraitParts('bia', 'festa')).toEqual(['hair-back', 'legs', 'hands', 'body', 'face', 'hair-bia', 'brows', 'eyes', 'mouth']);
  expect(portraitParts('leo', 'mira')).toContain('body-mira-shorts'); expect(portraitParts('rui', 'sol')).toContain('hair-back-short');
  expect(portraitParts('luna', 'superman')).toEqual(['cape-superman', 'hair-back', 'legs', 'hands', 'body-superman', 'face', 'hair-luna', 'brows', 'eyes', 'mouth']);
  expect(portraitParts('bia', 'spiderman').at(-1)).toBe('mask-spiderman');
  expect(portraitParts('pipoca', 'sol')).toEqual(['tail', 'ears', 'body', 'eyes']);
});
it('the t-shirt cut carries the look emblem too, not the sun of "Dia de sol" (#20)', () => {
  const layer = (source: string, id: string) => source.slice(source.indexOf(`<g id="${id}"`)).split('</g>')[0];
  const mar = layer(lookSource('mar'), 'body-casual');
  expect(mar).toContain('href="#pattern-mar"'); expect(mar).not.toContain('#pattern-sol');
  expect(layer(actorSource('leo', 'estrela'), outfitOf('leo', 'estrela'))).toContain('href="#pattern-estrela"');
});
