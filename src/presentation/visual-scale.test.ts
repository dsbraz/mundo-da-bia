import { expect, it } from 'vitest';
import { initialWorld } from '../domain/world';
import { actorScale, posePoint, handAnchor } from './pose';
import { itemPoint } from './targets';
it('rua reduz humanos, gatos e mãos a 60% sem mudar a posição lógica', () => {
  for (const actor of initialWorld().actors) {
    expect(actorScale(actor, 'street')).toBeCloseTo(actorScale(actor) * .6);
    const local = posePoint(actor, handAnchor(actor));
    const street = posePoint(actor, handAnchor(actor), 'street');
    expect(street.x - actor.x).toBeCloseTo((local.x - actor.x) * .6);
    expect(street.y - actor.y).toBeCloseTo((local.y - actor.y) * .6);
  }
});
it('objetos no chão e na mão compartilham a escala da rua', () => {
  const world = initialWorld(), actor = world.actors[0]!;
  const item = { ...world.items[0]!, holder: null, spot: 'floor' as const, x: 400, y: 500, room: world.room };
  expect(itemPoint({ ...world, streetWidth: 3000 }, item)).toEqual({ x: 400, y: 483.2 });
  expect(itemPoint({ ...world, streetWidth: 3000 }, { ...item, holder: actor.id })).toEqual(posePoint(actor, handAnchor(actor), 'street'));
});

it('porta externa acompanha a escala humana de rua', async () => {
  const { doorway } = await import('../domain/doorway');
  expect(doorway.facade.height).toBeCloseTo(doorway.interior.height * .6);
  expect(doorway.facade.y + doorway.facade.height).toBe(447);
});
