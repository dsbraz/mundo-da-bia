import { expect, it } from 'vitest';
import { shadowLayers } from './contact-shadow';

it('sombra de contato: elipse com alpha 0,2 e um núcleo menor que escurece o centro', () => {
  const [outer, core] = shadowLayers(56, 8);
  expect(outer).toEqual({ width: 56, height: 8, alpha: .2 });
  expect(core!.width).toBeLessThan(56); expect(core!.height).toBeLessThan(8); expect(core!.alpha).toBeGreaterThan(0);
  // Stacked, the centre reads clearly darker than the rim but stays a soft shadow.
  const centre = 1 - (1 - outer!.alpha) * (1 - core!.alpha);
  expect(centre).toBeGreaterThan(.28); expect(centre).toBeLessThan(.4);
});
