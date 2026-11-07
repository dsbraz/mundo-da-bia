import type { Actor, ActorId, Item, ItemId, Layout, Palette, Point, RoomId } from './types';
export type Location = { kind: 'street' } | { kind: 'interior'; building: number; room: RoomId };
export const buildingModels = ['house', 'apartment', 'shop'] as const;
export type BuildingModel = typeof buildingModels[number];
export interface Building { id: number; name: string; model: BuildingModel; color: Palette; plot: number; entry: RoomId; layout: Layout; show: boolean }
export interface Resident extends Actor { location: Location }
export interface NeighborhoodItem extends Item { location: Location }
export interface Neighborhood { buildings: Building[]; actors: Resident[]; items: NeighborhoodItem[]; location: Location; plots: number; nextBuilding: number }
export type NeighborhoodAction =
  | { type: 'visit'; location: Location }
  | { type: 'transport'; actor?: ActorId; item?: ItemId; location: Location; point: Point }
  | { type: 'construct'; plot: number; model: BuildingModel }
  | { type: 'facade'; building: number; name?: string; color?: Palette }
  | { type: 'duplicate'; building: number };
