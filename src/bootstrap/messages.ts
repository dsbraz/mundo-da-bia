import type { PresentationEvent } from '../domain/types';
export const eventMessages: Record<PresentationEvent['type'], string> = {
  named: 'Nome salvo!',
  furniture: 'A casa também brinca com você!', moved: 'Novo lugar para brincar!', dressed: 'Look novo!', picked: 'Objeto na mão!', dropped: 'Objeto solto.',
  fed: 'Lanche servido.', rested: 'Hora de cuidar.', room: 'Vamos explorar!', summoned: 'A turma chegou.', show: 'A música é por sua conta! Vamos dançar!',
};
export const blockedMessage = 'Esse lugar está ocupado ou sem passagem.';
export const occupiedOutdoorMessage = 'Esse lugar está ocupado. Há outros lugares para brincar!';
export const invalidEditMessage = 'Escolha um espaço livre. Móveis precisam de chão e a porta precisa de passagem.';
export function modeMessage(building: boolean, constructing: boolean) {
  if (!building) return 'Sua casa está pronta para brincar!';
  return constructing ? 'Escolha uma casa pronta ou amplie com cartões de cômodos.' : 'Escolha uma peça. Arraste para mudar de lugar. Experimente sem medo: dá para desfazer!';
}
export function announcer(root: HTMLElement) {
  return (text: string) => { root.querySelector('#announcement')!.textContent = text; };
}
