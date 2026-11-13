export const actorIds = ['bia', 'luna', 'leo', 'rui', 'mimi', 'nino', 'pipoca'] as const;
export const lookIds = ['sol', 'jardim', 'estrela', 'mar', 'festa', 'pijama', 'neon', 'aurora', 'denim', 'rehearsal', 'overalls', 'rumi', 'mira', 'zoey', 'spiderman', 'superman', 'chef', 'doctor', 'gardener', 'builder', 'nurse', 'police', 'detective', 'office', 'sport', 'outing'] as const;
export const roomIds = ['sala', 'quarto'] as const;
export const itemIds = ['lanche', 'peixe', 'microfone', 'ursinho'] as const;
export type ActorId = typeof actorIds[number];
/** Who is a person and who a cat (W3L-18): by id, never by the position in a list, so a save with more or fewer characters reads right. */
export const actorKinds: Record<ActorId, 'human' | 'cat'> = { bia: 'human', luna: 'human', leo: 'human', rui: 'human', mimi: 'cat', nino: 'cat', pipoca: 'cat' };
export type LookId = typeof lookIds[number];
export type RoomId = typeof roomIds[number] | `room-${number}`;
export const roomTemplates = ['empty', 'bedroom', 'kitchen', 'bathroom', 'studio', 'garden', 'laundry', 'library', 'dining', 'reception', 'consultation', 'ward', 'dispatch', 'investigation', 'office', 'meeting', 'breakroom', 'playground', 'classroom', 'sportsfield', 'gym',
  'market'] as const;
export const roomSizes = ['small', 'medium', 'large'] as const;
export type RoomTemplate = typeof roomTemplates[number];
export type RoomSize = typeof roomSizes[number];
/** Objects outside the legacy single-house save: the ball, dishes and the 6 props. */
export const portableKinds = ['bola', 'prato', 'estetoscopio', 'curativo', 'regador', 'lanterna', 'colher', 'cesta'] as const;
export type ItemKind = typeof itemIds[number] | typeof portableKinds[number];
export type ItemId = ItemKind | `${number}:${ItemKind}`;
export interface Point { x: number; y: number }
export const spots = ['floor', 'table', 'drawer', 'fridge'] as const;
/** A seat (W3L-06): the piece's id and which of its seats, `"<piece>.<slot>"`. */
export type SeatRef = `${number}.${number}`;
export type Spot = typeof spots[number];
export interface Home { lamp: boolean; fridge: boolean; drawer: boolean }
export interface Actor extends Point {
  name?: string;
  seat: SeatRef | null;
  id: ActorId;
  kind: 'human' | 'cat';
  room: RoomId;
  look: LookId;
  fed: boolean;
  resting: boolean;
  /** Hunger, sleep and boredom of this session (`needs.ts`); never saved, absent means the morning's 20/0/0. */
  needs?: Needs;
}
/** 0 is "bem" and 100 the ceiling; fractions accumulate between ticks and only bands leave the domain. `alegria`: ms of play left on
 *  the last joy (favourite dish, favourite game, hug), 0 when there is none. */
export interface Needs { fome: number; sono: number; tedio: number; alegria: number }
export interface Item extends Point { id: ItemId; kind?: ItemKind; room: RoomId; holder: ActorId | null; spot: Spot }
export interface World { streetWidth?: number; layout: Layout; home: Home; room: RoomId; actors: Actor[]; items: Item[]; show: boolean }
export type Action =
  | { type: 'name'; actor: ActorId; name: string }
  | { type: 'transfer'; item: ItemId; room: RoomId; point: Point }
  | { type: 'cross'; actor: ActorId; direction: 'left' | 'right' }
  | { type: 'use'; id: number }
  | { type: 'travel'; actor: ActorId; room: RoomId }
  | { type: 'interact'; target: keyof Home }
  | { type: 'sit'; actor: ActorId; seat: SeatRef }
  | { type: 'put'; item: ItemId; spot: Exclude<Spot, 'floor'> }
  | { type: 'move'; actor: ActorId; point: Point }
  | { type: 'dress'; actor: ActorId; look: LookId }
  | { type: 'pick'; actor: ActorId; item: ItemId }
  | { type: 'give'; actor: ActorId; item: ItemId }
  /** `actor` hugs `other` (W3L-14): dropped on someone, or the Luna caring on her own. */
  | { type: 'hug'; actor: ActorId; other: ActorId }
  | { type: 'place'; item: ItemId; point: Point }
  | { type: 'drop' | 'feed'; actor: ActorId }
  /** `own`: lying down on her own (W3L-19); a cat then leaves sofa and bed seats to the people. */
  | { type: 'rest'; actor: ActorId; own?: boolean }
  | { type: 'room'; room: RoomId }
  | { type: 'summon' }
  | { type: 'show' };
/** Ephemeral: never saved. `cooked`, `ate`, `harvested`, `served`, `letter` and `hint` belong to the wave 3 systems (lines in W3-02). */
/** What a refusal shows is missing (W3L-02): a free seat, a place to put it, a free hand, the right food, a way there, a table with a
 *  chair (W3L-07), a bed to sleep in (W3L-15). */
export type Need = 'seat' | 'place' | 'hands' | 'food' | 'path' | 'table' | 'bed'
  /** Lot 4: the piece with the utensil (W3L-16), a market to buy from, the checkout before leaving (W3L-22). */
  | 'stove' | 'counter' | 'market' | 'checkout';
export interface PresentationEvent {
  type: 'named' | 'furniture' | 'moved' | 'dressed' | 'picked' | 'dropped' | 'fed' | 'rested' | 'room' | 'summoned' | 'show'
    | 'cooked' | 'ate' | 'sniffed' | 'harvested' | 'served' | 'letter' | 'hint' | 'missing' | 'hugged';
  actor?: ActorId; piece?: number;
  /** On `missing`: what was missing, and who already sits there (a taken seat); on `hugged`, who gave the hug. */
  need?: Need; by?: ActorId;
  /** On `missing`: the piece that is not in this room (a door arrow if it is elsewhere, the Create card if nowhere). */
  want?: PieceKind;
  /** On `ate`: the dish eaten (a recipe id), and whether it is the eater's favourite (the big reaction). */
  recipe?: string;
  favorite?: true;
}
export interface Transition { state: World; events: PresentationEvent[] }

export const pieceKinds = ['sofa', 'wardrobe', 'fridge', 'lamp', 'table', 'stage', 'bed', 'dresser', 'cat-bed', 'rug', 'plant', 'picture', 'cushion', 'neon', 'speaker', 'mirror', 'counter', 'stove', 'bath', 'desk', 'shelf', 'piano', 'tv', 'aquarium', 'armchair', 'reading-lamp', 'side-table', 'sink', 'washer', 'planter', 'picnic-table', 'bookcase', 'kitchen-cart', 'chair',
  'market-shelf', 'checkout'] as const;
export const paletteIds = ['original', 'mint', 'lilac', 'rose', 'sky', 'gold'] as const;
export type PieceKind = typeof pieceKinds[number];
export type Palette = typeof paletteIds[number];
export const cropIds = ['alface', 'tomate', 'cenoura', 'milho', 'morango', 'abobora'] as const;
export type CropId = typeof cropIds[number];
/** A crop in a plot or planter: stage 0 (seed) to 4 (ready), watered since `since` (ms). */
export interface Plant { crop: CropId; stage: 0 | 1 | 2 | 3 | 4; since: number; watered: boolean }
export interface Piece extends Point { id: number; kind: PieceKind; room: RoomId; color: Palette; flipped: boolean; active?: boolean; plant?: Plant }
export interface Finish { wall: Palette; floor: Palette }
export interface Room extends Finish { name: string; template: RoomTemplate; size: RoomSize; cell: number; home: Home }
export interface Layout { pieces: Piece[]; rooms: Record<RoomId, Room>; nextId: number; nextRoomId: number }
export type EditAction =
  | { type: 'add'; kind: PieceKind; point?: Point }
  | { type: 'move'; id: number; point: Point }
  | { type: 'remove'; id: number }
  | { type: 'flip'; id: number }
  | { type: 'color'; id: number; color: Palette }
  | { type: 'finish'; surface: keyof Finish; value: Palette }
  | { type: 'clear' };
export interface House { id: number; name: string; state: World }
export interface Album { active: number; houses: House[] }
