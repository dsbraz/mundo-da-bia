import { describe, expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { selfCare } from './autonomy';
import type { ActorId, Item, Needs, World } from './types';

const needs = (patch: Partial<Needs>): Needs => ({ fome: 20, sono: 0, tedio: 0, alegria: 0, ...patch });
const feel = (world: World, id: ActorId, patch: Partial<Needs>): World => ({ ...world, actors: world.actors.map(a => a.id === id ? { ...a, needs: needs(patch) } : a) });
/** The bedroom (bed 8, cat bed 10) with the Bia, the Nino and the Pipoca; everyone else in the living room. */
function bedroom(): World {
  const world = initialWorld();
  return { ...world, room: 'quarto', actors: world.actors.map(a => ['bia', 'nino', 'pipoca'].includes(a.id) ? { ...a, room: 'quarto', seat: null, x: 300 + world.actors.indexOf(a) * 60, y: 530 } : a) };
}
const ball: Item = { id: '9:bola', kind: 'bola', room: 'sala', x: 700, y: 530, holder: null, spot: 'floor' };
const withBall = (world: World, patch: Partial<Item> = {}): World => ({ ...world, items: [...world.items, { ...ball, ...patch }] });

describe('autonomia leve dos não selecionados (W3L-19, §3.6)', () => {
  it('com sono (precisa), o gato vai para a caminha do cômodo; uma pessoa, para a cama ou o sofá livre', () => {
    expect(selfCare(feel(bedroom(), 'nino', { sono: 75 }), 'bia')).toEqual({ type: 'rest', actor: 'nino', seat: '10.0' });
    expect(selfCare(feel(initialWorld(), 'rui', { sono: 80 }), 'bia')).toEqual({ type: 'rest', actor: 'rui', seat: '2.0' });
    expect(selfCare(feel(bedroom(), 'bia', { sono: 80 }), 'nino')).toEqual({ type: 'rest', actor: 'bia', seat: '8.0' });
  });
  it('o gato sozinho nunca toma sofá nem cama: caminha livre, senão o tapete; sem os dois, nada (os assentos ficam para as pessoas)', () => {
    const living = feel(initialWorld(), 'mimi', { sono: 80 });
    const awake = { ...living, actors: living.actors.map(a => a.id === 'mimi' ? { ...a, seat: null, x: 930, y: 530 } : a) };
    expect(selfCare(awake, 'bia')).toEqual({ type: 'rest', actor: 'mimi', seat: null });
    const rest = transition(awake, { type: 'rest', actor: 'mimi', own: true }).state.actors.find(a => a.id === 'mimi')!;
    expect(rest).toMatchObject({ seat: null, resting: true });
    const noRug = { ...awake, layout: { ...awake.layout, pieces: awake.layout.pieces.filter(p => p.kind !== 'rug') } };
    expect(selfCare(noRug, 'bia')).toBeNull();
    expect(transition(noRug, { type: 'rest', actor: 'mimi', own: true }).state.actors.find(a => a.id === 'mimi')!.resting).toBe(false);
    // The child's own Descansar still lets a cat nap on the sofa.
    expect(transition(noRug, { type: 'rest', actor: 'mimi' }).state.actors.find(a => a.id === 'mimi')!.seat).toMatch(/^2\./);
  });
  it('só em `precisa`, só acordado, e sem lugar para dormir não faz nada', () => {
    expect(selfCare(feel(bedroom(), 'nino', { sono: 69 }), 'bia')).toBeNull();
    const asleep = transition(feel(bedroom(), 'nino', { sono: 90 }), { type: 'rest', actor: 'nino' }).state;
    expect(selfCare(asleep, 'bia')).toBeNull();
    const world = feel(initialWorld(), 'rui', { sono: 80 }), bare = { ...world, layout: { ...world.layout, pieces: world.layout.pieces.filter(p => p.kind !== 'sofa') } };
    expect(selfCare(bare, 'bia')).toBeNull();
  });
  it('o mais sonolento primeiro', () => {
    expect(selfCare(feel(feel(bedroom(), 'nino', { sono: 75 }), 'pipoca', { sono: 90 }), 'bia')).toEqual({ type: 'rest', actor: 'pipoca', seat: '10.0' });
  });
  it('com tédio (precisa) e uma bola no chão do cômodo, brinca com ela', () => {
    expect(selfCare(withBall(feel(initialWorld(), 'rui', { tedio: 72 })), 'bia')).toEqual({ type: 'play', actor: 'rui', item: '9:bola' });
    expect(selfCare(withBall(feel(feel(initialWorld(), 'rui', { tedio: 72 }), 'leo', { tedio: 95 })), 'bia')).toEqual({ type: 'play', actor: 'leo', item: '9:bola' });
  });
  it('sem bola no chão do cômodo (na mão de alguém, na mesa, noutro cômodo ou outro objeto), ou sem tédio, nada', () => {
    const bored = feel(initialWorld(), 'rui', { tedio: 72 });
    expect(selfCare(bored, 'bia')).toBeNull();
    expect(selfCare(withBall(bored, { holder: 'leo' }), 'bia')).toBeNull();
    expect(selfCare(withBall(bored, { spot: 'table' }), 'bia')).toBeNull();
    expect(selfCare(withBall(bored, { room: 'quarto' }), 'bia')).toBeNull();
    expect(selfCare(withBall(bored, { id: '9:regador', kind: 'regador' }), 'bia')).toBeNull();
    expect(selfCare(withBall(feel(initialWorld(), 'rui', { tedio: 69 })), 'bia')).toBeNull();
  });
  it('o sono vem antes do tédio; as autonomias da Bia e da Luna vêm antes das duas', () => {
    const both = withBall(feel(feel(initialWorld(), 'rui', { tedio: 90 }), 'leo', { sono: 80 }));
    expect(selfCare(both, 'bia')?.type).toBe('rest');
    const sad = withBall(feel(feel(initialWorld(), 'mimi', { fome: 80, sono: 80 }), 'rui', { tedio: 90 }));
    expect(selfCare(sad, 'bia')).toEqual({ type: 'hug', actor: 'luna', other: 'mimi' });
  });
  it('nunca devolve ato de outro cômodo nem do selecionado', () => {
    const world = withBall(feel(feel(bedroom(), 'nino', { sono: 80 }), 'rui', { tedio: 90 }));
    expect(selfCare(world, 'nino')).toBeNull();
    for (const selected of ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'] as const) {
      const act = selfCare(feel(feel(feel(withBall(initialWorld()), 'rui', { tedio: 90 }), 'leo', { sono: 90 }), 'mimi', { sono: 90 }), selected);
      expect(act && act.actor).not.toBe(selected);
      expect(initialWorld().actors.find(a => a.id === act?.actor)?.room ?? 'sala').toBe('sala');
    }
  });
  it('com o interruptor de autonomia desligado, devolve null', () => {
    expect(selfCare(feel(bedroom(), 'nino', { sono: 75 }), 'bia', false)).toBeNull();
    expect(selfCare(withBall(feel(initialWorld(), 'rui', { tedio: 72 })), 'bia', false)).toBeNull();
    expect(selfCare(feel(initialWorld(), 'mimi', { fome: 80, sono: 80 }), 'bia', false)).toBeNull();
    expect(selfCare(feel(bedroom(), 'nino', { sono: 75 }), 'bia', true)).not.toBeNull();
  });
});
