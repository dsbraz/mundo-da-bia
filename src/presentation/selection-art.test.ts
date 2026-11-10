import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { selectionLayout } from './selection-art';
import { actorScale } from './pose';
import { selectionPulse } from './motion';

it('the selected label sits above the head, less than 40 px away, at both scales', () => {
  for (const actor of initialWorld().actors.filter(a => !a.seat)) for (const context of ['interior', 'street'] as const) {
    const head = -(actor.kind === 'cat' ? 120 : 220) * actorScale(actor, context);
    const layout = selectionLayout(actor, context);
    expect(layout.labelBottom).toBeLessThan(head + 1);
    expect(head - layout.labelBottom).toBeLessThan(40);
    expect(layout.star).toBeLessThan(layout.labelBottom - 20);
  }
});
it('the star pulses only without reduced motion', () => {
  expect(selectionPulse(0, true)).toBe(1); expect(selectionPulse(400, true)).toBe(1);
  expect(new Set([0, 200, 400, 600].map(t => selectionPulse(t, false))).size).toBeGreaterThan(1);
  expect(Math.max(...[0, 100, 200, 300, 400, 500].map(t => selectionPulse(t, false)))).toBeLessThanOrEqual(1.1);
});
