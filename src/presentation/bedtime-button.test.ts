import { expect, it } from 'vitest';
import { initialWorld, transition } from '../domain/world';
import { bedtimeMoves, bedtimeShown } from './bedtime-button';

it('"Todos para a cama" só aparece ao entardecer e à noite (lote 6B)', () => {
  expect((['manha', 'tarde', 'entardecer', 'noite', 'amanhecer'] as const).filter(phase => bedtimeShown(phase))).toEqual(['entardecer', 'noite']);
  // On the street there is no bed to go to.
  expect(bedtimeShown('noite', false)).toBe(false);
});
it('à vista, quem fica no cômodo e muda de lugar anda até o sofá ou a caminha; quem vai para outro cômodo ou fica parado não anda aqui', () => {
  const before = initialWorld(), after = transition(before, { type: 'bedtime' }).state;
  const moves = bedtimeMoves(before, after), walkers = moves.map(m => m.actor);
  // Léo walks to the sofa seat left free; Luna is already on hers; the Bia goes to the bedroom; Rui stays up (no bed for him).
  expect(walkers).toContain('leo');
  expect(walkers).not.toContain('luna');
  expect(walkers).not.toContain('bia');
  expect(walkers).not.toContain('rui');
  const leo = after.actors.find(a => a.id === 'leo')!;
  expect(moves.find(m => m.actor === 'leo')!.point).toEqual({ x: leo.x, y: leo.y });
  // The cats of the living room curl up on its rug: they walk there too, when it is somewhere else.
  for (const m of moves) expect(after.actors.find(a => a.id === m.actor)!.room).toBe('sala');
});
