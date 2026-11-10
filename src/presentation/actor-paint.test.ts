import { expect, it } from 'vitest';
import { actorSource, portraitParts } from './actor-paint';
import { actors, looks } from '../content/catalog';
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

it('paints skin, hair and outfit by role, with the current look pattern', () => {
  const source = actorSource('luna', 'festa');
  expect(source).toContain(hex(actors.luna.skin)); expect(source).toContain(hex(actors.luna.hair)); expect(source).toContain(hex(looks.festa.color));
  expect(source).not.toMatch(/#D79B70|#F5BF38|#E889A1/); expect(source).toContain('href="#pattern-festa"');
  expect(actorSource('mimi', 'sol')).toContain(hex(actors.mimi.skin)); expect(actorSource('mimi', 'sol')).not.toMatch(/#E9A35E|#B57940/);
});
it('the portrait uses the same layers the scene draws for the current look', () => {
  expect(portraitParts('bia', 'festa')).toEqual(['hair-back', 'legs', 'hands', 'body', 'face', 'hair-bia', 'eyes', 'mouth']);
  expect(portraitParts('leo', 'mira')).toContain('body-mira-shorts'); expect(portraitParts('rui', 'sol')).toContain('hair-back-short');
  expect(portraitParts('luna', 'superman')).toEqual(['cape-superman', 'hair-back', 'legs', 'hands', 'body-superman', 'face', 'hair-luna', 'eyes', 'mouth']);
  expect(portraitParts('bia', 'spiderman').at(-1)).toBe('mask-spiderman');
  expect(portraitParts('pipoca', 'sol')).toEqual(['tail', 'body', 'eyes']);
});
