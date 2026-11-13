import type { ActorId, Need, PresentationEvent } from '../domain/types';
import type { OutdoorAction } from '../domain/neighborhood-types';
import { actors } from './catalog';
import { linePool } from './lines';

// Every line spoken in the scene: at most 6 words, a 7-year-old's vocabulary, the current name interpolated.
export const nameOf = (actor: { id: ActorId; name?: string | undefined }) => actor.name ?? actors[actor.id].name;
export const say = (line: string, name: string) => line.replaceAll('{nome}', name);

const sceneLines: Partial<Record<PresentationEvent['type'], string>> = {
  furniture: 'A casa brinca junto!', room: 'Lugar novo! O que tem aqui?', summoned: 'A turma toda chegou!', show: 'Música! Todo mundo dança!',
};
type Speaker = { id: ActorId; name?: string | undefined };
/** The `turn`-th line (in rotation) of `actor` for `type`, or the scene's line for an event nobody speaks; null when nothing is said. */
export function eventLine(type: PresentationEvent['type'], actor: Speaker | undefined, cat: boolean, turn = 0, favorite = false): string | null {
  const pool = actor ? linePool(type, actor.id, cat, favorite) : null;
  if (pool && actor) return say(pool[turn % pool.length]!, nameOf(actor));
  return sceneLines[type] ?? null;
}
/** Deterministic rotation: each character goes through its lines for an event in order, separately per event. */
export function lineRotation() {
  const turns = new Map<string, number>();
  return (type: PresentationEvent['type'], actor: Speaker | undefined, cat: boolean, favorite = false) => {
    const key = `${actor?.id}:${type}${favorite ? ':favorite' : ''}`, turn = turns.get(key) ?? 0;
    turns.set(key, turn + 1);
    return eventLine(type, actor, cat, turn, favorite);
  };
}

export type Refusal = 'outdoor' | 'blocked' | 'walk' | 'edit';
const refusals: Record<Refusal, string> = {
  outdoor: '{nome} está aqui agora!', blocked: 'Hmm, por aqui não passa.', walk: 'Ali não cabe. Que tal aqui?',
  edit: 'Aqui não cabe. Tenta outro cantinho?',
};
export const refusal = (kind: Refusal, name: string) => say(refusals[kind], name);
/** What a missing bubble means, for screen readers only (W3L-02): the bubble itself is a drawing. */
const needLines: Record<Need, string> = {
  seat: 'Falta um lugar para sentar.', place: 'Aqui não tem lugar.', hands: 'As mãos estão cheias.', food: 'Essa comida não serve.', path: 'Por aqui não passa.', table: 'Falta uma mesa com cadeira.', bed: 'Falta uma cama para dormir.',
};
export const needLine = (need: Need, by?: string) => by ? say('{nome} já está aí!', by) : needLines[need];
/** What a thought bubble means (W3L-12), for screen readers only. */
const thoughtLines: Record<'fome' | 'sono' | 'tedio', string> = { fome: '{nome} está com fome.', sono: '{nome} está com sono.', tedio: '{nome} quer brincar.' };
export const thoughtLine = (need: 'fome' | 'sono' | 'tedio', name: string) => say(thoughtLines[need], name);

const outdoorLines: Record<Exclude<OutdoorAction['target'], 'leave'>, string> = {
  bench: '{nome} descansa no banco.', swing: 'Vai e vem, {nome}!', water: '{nome} molhou o jardim!',
  bell: 'Dlim, dlom! {nome} chegou!', mail: '{nome} achou uma carta!',
};
export const outdoorLine = (target: keyof typeof outdoorLines, name: string) => say(outdoorLines[target], name);

export function modeLine(building: boolean, constructing: boolean) {
  if (!building) return 'Hora de brincar na casa!';
  return constructing ? 'Casas prontas e cômodos novos aqui.' : 'Hora de arrumar! Dá para desfazer.';
}
export const welcomeLine = (name: string) => `${name} chegou! Vamos inventar uma história?`;
