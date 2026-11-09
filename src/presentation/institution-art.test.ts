import { expect, it } from 'vitest';
import { facadeSvg, roomArchitecture } from './architecture-art';
import { roomTemplates } from '../domain/types';
it('prévia de construção mostra os dois andares iniciais do hospital e escritório', () => {
  for (const model of ['hospital', 'office'] as const) expect(facadeSvg(model)).toBe(facadeSvg(model, 2));
});
it('instituições têm fachadas distintas em cada quantidade de andares', () => {
  for (const floors of [1, 2, 3]) {
    const images = (['hospital', 'police', 'office', 'apartment'] as const).map(model => facadeSvg(model, floors));
    expect(new Set(images).size).toBe(4);
  }
});
it('todos os ambientes têm arquitetura completa sem valores ausentes', () => {
  for (const template of roomTemplates) {
    const svg = roomArchitecture(template);
    expect(svg).not.toMatch(/undefined|NaN/);
    expect(svg).toContain('viewBox="0 0 1000 600"');
  }
});
