export const actorIds = ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'] as const;
export const lookIds = ['sol', 'jardim', 'estrela', 'mar', 'festa', 'pijama'] as const;
export const roomIds = ['sala', 'quarto'] as const;
export const itemIds = ['lanche', 'peixe', 'microfone', 'ursinho'] as const;
export type ActorId = typeof actorIds[number];
export type LookId = typeof lookIds[number];
export type RoomId = typeof roomIds[number];
export type ItemId = typeof itemIds[number];
export interface Point { x: number; y: number }
export interface Actor extends Point {
  id: ActorId;
  kind: 'human' | 'cat';
  room: RoomId;
  look: LookId;
  fed: boolean;
  resting: boolean;
}
export interface Item extends Point { id: ItemId; room: RoomId; holder: ActorId | null }
export interface World { room: RoomId; actors: Actor[]; items: Item[]; show: boolean }
export type Action =
  | { type: 'move'; actor: ActorId; point: Point }
  | { type: 'dress'; actor: ActorId; look: LookId }
  | { type: 'pick'; actor: ActorId; item: ItemId }
  | { type: 'drop' | 'feed' | 'rest'; actor: ActorId }
  | { type: 'room'; room: RoomId }
  | { type: 'summon' }
  | { type: 'show' };
export interface PresentationEvent { type: 'moved' | 'dressed' | 'picked' | 'dropped' | 'fed' | 'rested' | 'room' | 'summoned' | 'show'; actor?: ActorId }
export interface Transition { state: World; events: PresentationEvent[] }
