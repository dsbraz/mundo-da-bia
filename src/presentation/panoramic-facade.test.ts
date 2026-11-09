import { expect, it } from 'vitest';
import { buildingModels } from '../domain/neighborhood-types';
import { facadeSvg } from './architecture-art';
it('todas as famílias de um a três andares têm painéis com dimensões válidas', () => {
  for (const model of buildingModels) for (const floors of [1, 2, 3]) {
    const svg = facadeSvg(model, floors);
    for (const match of svg.matchAll(/<rect\b[^>]*\s(height|width)="([^"]+)"/g)) {
      expect(Number(match[2]), `${model}, ${floors}, ${match[0]}`).toBeGreaterThanOrEqual(0);
    }
  }
});
