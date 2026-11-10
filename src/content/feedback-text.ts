import type { ActorId, PresentationEvent } from '../domain/types';
import type { OutdoorAction } from '../domain/neighborhood-types';
import { actors } from './catalog';

// Every line spoken in the scene: at most 6 words, a 7-year-old's vocabulary, the current name interpolated.
export const nameOf = (actor: { id: ActorId; name?: string | undefined }) => actor.name ?? actors[actor.id].name;
export const say = (line: string, name: string) => line.replaceAll('{nome}', name);

const humanLines: Partial<Record<PresentationEvent['type'], string>> = {
  dressed: '{nome} amou o look novo!', picked: 'Oba! {nome} pegou!', dropped: '{nome} deixou aqui.',
  fed: 'Hummm! {nome} adorou!', rested: '{nome} está descansando.', named: 'Oi! Agora sou {nome}!',
};
const catLines: Partial<Record<PresentationEvent['type'], string>> = {
  dressed: 'Miau! ({nome} se achou lindo)', picked: 'Miau? ({nome} quer brincar)', dropped: 'Miau! ({nome} largou)',
  fed: 'Miau! ({nome}: tem mais peixinho?)', rested: 'Rrrron… {nome} cochila.', named: 'Miau! ({nome} gostou do nome)',
};
const sceneLines: Partial<Record<PresentationEvent['type'], string>> = {
  furniture: 'A casa brinca junto!', room: 'Lugar novo! O que tem aqui?', summoned: 'A turma toda chegou!', show: 'Música! Todo mundo dança!',
};
export function eventLine(type: PresentationEvent['type'], actor: { id: ActorId; name?: string | undefined } | undefined, cat: boolean): string | null {
  if (type === 'moved') return null;
  const personal = actor ? (cat ? catLines : humanLines)[type] : undefined;
  if (personal && actor) return say(personal, nameOf(actor));
  return sceneLines[type] ?? null;
}

export type Refusal = 'outdoor' | 'blocked' | 'walk' | 'hand' | 'edit';
const refusals: Record<Refusal, string> = {
  outdoor: '{nome} está aqui agora!', blocked: 'Hmm, por aqui não passa.', walk: 'Ali não cabe. Que tal aqui?',
  hand: 'Mãos cheias! Larga um antes.', edit: 'Aqui não cabe. Tenta outro cantinho?',
};
export const refusal = (kind: Refusal, name: string) => say(refusals[kind], name);

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
