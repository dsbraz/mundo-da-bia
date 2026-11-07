export const actorIds = ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'] as const;
export const lookIds = ['sol', 'jardim', 'estrela', 'mar', 'festa', 'pijama', 'neon', 'aurora'] as const;
export const roomIds = ['sala', 'quarto'] as const;
export const itemIds = ['lanche', 'peixe', 'microfone', 'ursinho'] as const;
export type ActorId = typeof actorIds[number];
export type LookId = typeof lookIds[number];
export type RoomId = typeof roomIds[number];
export type ItemId = typeof itemIds[number];
export interface Point { x: number; y: number }
export const seatIds = ['sofa-left', 'sofa-right', 'bed'] as const;
export const spots = ['floor', 'table', 'drawer', 'fridge'] as const;
export type SeatId = typeof seatIds[number];
export type Spot = typeof spots[number];
export interface Home { lamp: boolean; fridge: boolean; drawer: boolean }
export interface Actor extends Point {
  seat: SeatId | null;
  id: ActorId;
  kind: 'human' | 'cat';
  room: RoomId;
  look: LookId;
  fed: boolean;
  resting: boolean;
}
export interface Item extends Point { id: ItemId; room: RoomId; holder: ActorId | null; spot: Spot }
export interface World { layout: Layout; home: Home; room: RoomId; actors: Actor[]; items: Item[]; show: boolean }
export type Action =
  | { type: 'interact'; target: keyof Home }
  | { type: 'sit'; actor: ActorId; seat: SeatId }
  | { type: 'put'; item: ItemId; spot: Exclude<Spot, 'floor'> }
  | { type: 'move'; actor: ActorId; point: Point }
  | { type: 'dress'; actor: ActorId; look: LookId }
  | { type: 'pick'; actor: ActorId; item: ItemId }
  | { type: 'give'; actor: ActorId; item: ItemId }
  | { type: 'place'; item: ItemId; point: Point }
  | { type: 'drop' | 'feed' | 'rest'; actor: ActorId }
  | { type: 'room'; room: RoomId }
  | { type: 'summon' }
  | { type: 'show' };
export interface PresentationEvent { type: 'furniture' | 'moved' | 'dressed' | 'picked' | 'dropped' | 'fed' | 'rested' | 'room' | 'summoned' | 'show'; actor?: ActorId }
export interface Transition { state: World; events: PresentationEvent[] }

export const pieceKinds = ['sofa', 'wardrobe', 'fridge', 'lamp', 'table', 'stage', 'bed', 'dresser', 'cat-bed', 'rug', 'plant', 'picture', 'cushion', 'neon', 'speaker', 'mirror'] as const;
export const paletteIds = ['original', 'mint', 'lilac', 'rose', 'sky', 'gold'] as const;
export type PieceKind = typeof pieceKinds[number];
export type Palette = typeof paletteIds[number];
export interface Piece extends Point { id: number; kind: PieceKind; room: RoomId; color: Palette; flipped: boolean }
export interface Finish { wall: Palette; floor: Palette }
export interface Layout { pieces: Piece[]; rooms: Record<RoomId, Finish>; nextId: number }
export type EditAction =
  | { type: 'add'; kind: PieceKind }
  | { type: 'move'; id: number; point: Point }
  | { type: 'remove'; id: number }
  | { type: 'flip'; id: number }
  | { type: 'color'; id: number; color: Palette }
  | { type: 'finish'; surface: keyof Finish; value: Palette }
  | { type: 'clear' };
export interface House { id: number; name: string; state: World }
export interface Album { active: number; houses: House[] }
