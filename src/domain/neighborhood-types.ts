import type { Actor, ActorId, Item, ItemId, Layout, Palette, Point, RoomId, RoomTemplate } from './types';
import type { Progress } from './progress';
export interface Outdoor { bench: ActorId | null; swing: ActorId | null; watered: boolean; mail: number[]; bells: number[] }
export type OutdoorAction = { type: 'outdoor'; actor: ActorId; target: 'bench' | 'swing' | 'water' | 'leave' | 'bell' | 'mail'; building?: number };
export type Location = { kind: 'street' } | { kind: 'interior'; building: number; room: RoomId };
export const buildingModels = ['house', 'apartment', 'shop', 'hospital', 'police', 'office', 'fire-station', 'school', 'stadium', 'sports-club'] as const;
export type BuildingModel = typeof buildingModels[number];
export interface Building { id: number; name: string; model: BuildingModel; color: Palette; plot: number; entry: RoomId; layout: Layout; show: boolean }
export interface Resident extends Actor { location: Location }
export interface NeighborhoodItem extends Item { location: Location }
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
export type NeighborhoodAction = ModuleAction | OutdoorAction

  | { type: 'visit'; location: Location }
  | { type: 'transport'; actor?: ActorId; item?: ItemId; location: Location; point: Point }
  | { type: 'construct'; plot: number; model: BuildingModel }
  | { type: 'facade'; building: number; name?: string; color?: Palette }
  | { type: 'duplicate'; building: number }
  | { type: 'remove-building'; building: number }
  | { type: 'move-building'; building: number; plot: number };
