import type { Neighborhood } from '../domain/neighborhood-types';
import type { ActorId, Point } from '../domain/types';
import { plotStart } from '../domain/neighborhood-geometry';
import { outdoorPoints } from '../domain/outdoor';
import type { OutdoorAction } from '../domain/neighborhood-types';
import { actors } from '../content/catalog';
import { positionTargets } from './viewport';
export interface OutdoorTarget { name: string; point: Point; target: OutdoorAction['target']; building?: number }
type Seat = 'bench' | 'swing';
const seatNames: Record<Seat, { free: string; mine: string; taken: string }> = {
  bench: { free: 'Sentar no banco', mine: 'Levantar do banco', taken: 'Banco com' },
  swing: { free: 'Balançar', mine: 'Descer do balanço', taken: 'Balanço com' },
};
function seatName(town: Neighborhood, seat: Seat, selected?: ActorId) {
  const occupant = town.outdoor[seat], names = seatNames[seat];
  if (!occupant) return names.free;
  if (occupant === selected) return names.mine;
  return `${names.taken} ${town.actors.find(a => a.id === occupant)?.name ?? actors[occupant].name}`;
}
export function outdoorTargets(town: Neighborhood, selected?: ActorId): OutdoorTarget[] {
  if (town.location.kind !== 'street') return [];
  return [
    { name: seatName(town, 'bench', selected), target: 'bench', point: outdoorPoints.bench },
    { name: seatName(town, 'swing', selected), target: 'swing', point: outdoorPoints.swing },
    { name: town.outdoor.watered ? 'Regar de novo' : 'Regar plantas', target: 'water', point: outdoorPoints.water },
    ...town.buildings.flatMap(b => [
      { name: `Campainha · ${b.name}`, target: 'bell' as const, building: b.id, point: { x: plotStart(b.plot) + 280, y: 440 } },
      { name: `Correio · ${b.name}`, target: 'mail' as const, building: b.id, point: { x: plotStart(b.plot) + 320, y: 475 } },
    ]),
  ];
}
export function outdoorAt(town: Neighborhood, point: Point) { return outdoorTargets(town).find(t => Math.abs(t.point.x - point.x) < 48 && Math.abs(t.point.y - point.y) < 55); }
/** Plaza equipment answers to taps on the drawing; these buttons stay invisible, for keyboard and screen readers only. */
export function outdoorControls(root: HTMLElement, use: (target: OutdoorTarget) => void) {
  const layer = document.createElement('div'); layer.className = 'scene-controls outdoor-targets'; root.append(layer);
  return (town: Neighborhood, selected: ActorId, camera: number, building: boolean) => {
    layer.replaceChildren();
    if (building) return;
    outdoorTargets(town, selected).filter(t => t.point.x > camera + 65 && t.point.x < camera + 935).forEach(target => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'scene-target'; button.textContent = target.name;
      button.dataset.worldX = String(target.point.x); button.dataset.worldY = String(target.point.y);
      button.onclick = () => use(target); layer.append(button);
    });
    positionTargets(root);
  };
}
