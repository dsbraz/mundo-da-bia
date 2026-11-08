import type { Neighborhood } from '../domain/neighborhood-types';
import type { ActorId, Point } from '../domain/types';
import { plotStart } from '../domain/neighborhood-geometry';
import { outdoorPoints } from '../domain/outdoor';
import type { OutdoorAction } from '../domain/neighborhood-types';
export interface OutdoorTarget { name: string; point: Point; target: OutdoorAction['target']; building?: number }
export function outdoorTargets(town: Neighborhood): OutdoorTarget[] {
  if (town.location.kind !== 'street') return [];
  return [
    { name: town.outdoor.bench ? 'Banco ocupado' : 'Sentar no banco', target: 'bench', point: outdoorPoints.bench },
    { name: town.outdoor.swing ? 'Balanço ocupado' : 'Balançar', target: 'swing', point: outdoorPoints.swing },
    { name: town.outdoor.watered ? 'Regar de novo' : 'Regar plantas', target: 'water', point: outdoorPoints.water },
    ...town.buildings.flatMap(b => [
      { name: `Campainha · ${b.name}`, target: 'bell' as const, building: b.id, point: { x: plotStart(b.plot) + 280, y: 440 } },
      { name: `Correio · ${b.name}`, target: 'mail' as const, building: b.id, point: { x: plotStart(b.plot) + 320, y: 475 } },
    ]),
  ];
}
export function outdoorAt(town: Neighborhood, point: Point) { return outdoorTargets(town).find(t => Math.abs(t.point.x - point.x) < 48 && Math.abs(t.point.y - point.y) < 55); }
export function outdoorControls(root: HTMLElement, use: (target: OutdoorTarget) => void, leave: () => void) {
  const layer = document.createElement('div'); layer.className = 'outdoor-controls'; root.append(layer);
  const exit = document.createElement('button'); exit.textContent = 'Sair do equipamento'; exit.onclick = leave; root.querySelector('#actor-context')!.append(exit);
  return (town: Neighborhood, selected: ActorId, camera: number, building: boolean) => {
    exit.hidden = town.outdoor.bench !== selected && town.outdoor.swing !== selected;
    const canvas = root.querySelector('canvas'), box = canvas?.getBoundingClientRect();
    layer.replaceChildren(); if (!box || building) return;
    outdoorTargets(town).filter(t => t.point.x > camera + 65 && t.point.x < camera + 935).forEach(target => {
      const button = document.createElement('button'); button.textContent = target.name; button.onclick = () => use(target);
      button.style.left = `${box.left + (target.point.x - camera) * box.width / 1000}px`; button.style.top = `${box.top + (target.point.y + 52) * box.height / 600}px`;
      layer.append(button);
    });
  };
}
