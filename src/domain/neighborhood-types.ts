import type { Actor, ActorId, CropId, Item, ItemId, Layout, Palette, Point, RoomId, RoomTemplate } from './types';
import type { PlazaPlot, Progress, RecipeId } from './progress';
import type { Ingredient, Stock, Utensil } from './ingredients';
import type { Phase } from './clock';
import type { Game } from './tastes';
export interface Outdoor { bench: ActorId | null; swing: ActorId | null; watered: boolean; mail: number[]; bells: number[] }
export type OutdoorAction = { type: 'outdoor'; actor: ActorId; target: 'bench' | 'swing' | 'water' | 'leave' | 'bell' | 'mail'; building?: number };
export type Location = { kind: 'street' } | { kind: 'interior'; building: number; room: RoomId };
export const buildingModels = ['house', 'apartment', 'shop', 'hospital', 'police', 'office', 'fire-station', 'school', 'stadium', 'sports-club'] as const;
export type BuildingModel = typeof buildingModels[number];
export interface Building { id: number; name: string; model: BuildingModel; color: Palette; plot: number; entry: RoomId; layout: Layout; show: boolean;
  /** The pantry (W3L-20): absent until the house first cooks, which reads as full. */
  stock?: Stock }
export interface Resident extends Actor { location: Location }
/** A dish carries its recipe (and `fancy` when made fancy). */
export interface NeighborhoodItem extends Item { location: Location; recipe?: RecipeId; fancy?: true }
export interface Neighborhood { outdoor: Outdoor; buildings: Building[]; actors: Resident[]; items: NeighborhoodItem[]; location: Location; plots: number; nextBuilding: number;
  /** What the child has gained (save v3). */
  progress: Progress;
  /** The number the next new item takes (`${nextItem}:${kind}`). */
  nextItem: number }
/** The neighborhood as saves v1 and v2 hold it, before progress and item numbering. */
export type LegacyNeighborhood = Omit<Neighborhood, 'progress' | 'nextItem'>;
export type ModuleAction =
  | { type: 'add-floor'; building: number }
  | { type: 'add-module'; building: number; cell: number; template: RoomTemplate }
  | { type: 'rename-module'; building: number; room: RoomId; name: string }
  | { type: 'move-module'; building: number; room: RoomId; cell: number }
  | { type: 'replace-module'; building: number; room: RoomId; template: RoomTemplate };
/** The plaza's vegetable garden (§3.3); time always comes in the action, in ms. */
export type GardenAction =
  | { type: 'plant'; plot: PlazaPlot; crop: CropId; now: number }
  | { type: 'water-plot'; plot: PlazaPlot; now: number }
  | { type: 'harvest'; plot: PlazaPlot }
  | { type: 'rain'; now: number };
/** Life goes on (§3.1): `elapsed` ms of session in Brincar since the last `live` (the domain counts at most 60 s), in day `phase`;
 *  boredom grows only for the `idle` (still and not playing; the domain cannot see who walks or plays). Never dispatched in Criar. */
export type LiveAction = { type: 'live'; elapsed: number; phase: Phase; idle?: readonly ActorId[] };
/** `actor` plays `game` (W3L-13): a game relieves boredom (never saved, like every need). */
export type EnjoyAction = { type: 'enjoy'; actor: ActorId; game: Game };
/** The night is slept through in `building` (W3L-15): whoever lies there in a bed or on a sofa wakes rested. */
export type MorningAction = { type: 'morning'; building: number };
export type NeighborhoodAction = ModuleAction | OutdoorAction
  | EnjoyAction | MorningAction

  | { type: 'visit'; location: Location }
  /** The time has come (ms, from the app's clock): what grows or arrives with time moves on. */
  | { type: 'tick'; now: number }
  | LiveAction
  | GardenAction
  /** At the bench of `piece`: `cook` mixes 1 to 3 ingredients with a utensil (§3.2). */
  | { type: 'cook'; building: number; piece: number; cook: ActorId; ingredients: readonly Ingredient[]; utensil: Utensil }
  | { type: 'transport'; actor?: ActorId; item?: ItemId; location: Location; point: Point }
  | { type: 'construct'; plot: number; model: BuildingModel }
  | { type: 'facade'; building: number; name?: string; color?: Palette }
  | { type: 'duplicate'; building: number }
  | { type: 'remove-building'; building: number }
  | { type: 'move-building'; building: number; plot: number };
