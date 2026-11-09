import { houseEdgePan } from './house-edge-pan';
import { plotAt, plotStart } from '../domain/neighborhood-geometry';
import type { Building, Neighborhood, NeighborhoodAction } from '../domain/neighborhood-types';
import { floorCount } from '../domain/modules';
import { facadeSvg, svgUrl } from './architecture-art';
import { positionTargets, screenToWorld } from './viewport';

export function houseHandles(root: HTMLElement, get: () => Neighborhood, dispatch: (a: NeighborhoodAction) => void, choose: (plot: number) => void, pan: (dx: number) => void) {
  const layer = document.createElement('div'); layer.className = 'scene-controls house-handles'; root.append(layer);
  let active: { id: number; house: number; x: number; y: number; button: HTMLButtonElement; dragged: boolean } | null = null;
  let suppress = false; let ghost: HTMLImageElement | null = null;
  const hint = root.querySelector('#announcement')!;
  const edge = houseEdgePan(root, pan, preview);
  function cancel() { edge(null); ghost?.remove(); ghost = null; active?.button.classList.remove('moving'); active = null; layer.querySelectorAll('.destination').forEach(b => b.classList.remove('destination')); }
  function destination(e: PointerEvent) {
    const canvas = root.querySelector('canvas')!, box = canvas.getBoundingClientRect();
    if (e.clientX < 0 || e.clientX > root.clientWidth || e.clientY < box.top || e.clientY > box.bottom) return -1;
    return plotAt(screenToWorld(canvas, { x: e.clientX, y: e.clientY }).x);
  }
  layer.addEventListener('pointerdown', e => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-house]');
    if (active || !button || e.button !== 0) return;
    suppress = false; active = { id: e.pointerId, house: Number(button.dataset.house), x: e.clientX, y: e.clientY, button, dragged: false };
    button.setPointerCapture(e.pointerId);
  });
  function preview(e: PointerEvent) {
    if (!active) return;
    active.dragged = true; active.button.classList.add('moving');
    if (!ghost) { const house = get().buildings.find(b => b.id === active!.house)!; ghost = document.createElement('img'); ghost.src = svgUrl(facadeSvg(house.model, floorCount(house.layout))); ghost.className = 'house-ghost'; layer.append(ghost); }
    ghost.style.left = `${e.clientX}px`; ghost.style.top = `${e.clientY}px`;
    const plot = destination(e), town = get(), target = town.buildings.find(b => b.plot === plot);
    layer.querySelectorAll<HTMLElement>('[data-plot]').forEach(b => b.classList.toggle('destination', Number(b.dataset.plot) === plot));
    hint.textContent = plot < 0 || plot >= town.plots ? 'Escolha um terreno no bairro.' : target?.id === active.house ? 'A casa continua aqui.' : target ? `Solte para trocar com ${target.name}.` : 'Solte para colocar neste terreno livre.';
  }
  layer.addEventListener('pointermove', e => {
    if (active?.id !== e.pointerId || (!active.dragged && Math.hypot(e.clientX - active.x, e.clientY - active.y) < 8)) return;
    preview(e); edge(e);
  });
  layer.addEventListener('pointerup', e => {
    if (active?.id !== e.pointerId) return;
    const { house, dragged } = active, plot = destination(e); suppress = dragged; cancel();
    if (dragged && plot >= 0 && plot < get().plots) dispatch({ type: 'move-building', building: house, plot });
  });
  layer.addEventListener('click', e => {
    if (active) return;
    const button = (e.target as HTMLElement).closest<HTMLElement>('[data-plot]');
    if (button && !(suppress && e.detail > 0)) choose(Number(button.dataset.plot));
  });
  layer.addEventListener('pointercancel', e => { if (active?.id === e.pointerId) { suppress = true; cancel(); } });
  layer.addEventListener('lostpointercapture', e => { if (active?.id === e.pointerId) { suppress = true; cancel(); } });
  window.addEventListener('blur', () => { suppress = true; cancel(); });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { suppress = true; cancel(); } });
  return (editing: boolean) => {
    cancel(); layer.replaceChildren(); layer.hidden = !editing || get().location.kind !== 'street';
    if (layer.hidden) return;
    const town = get();
    for (let plot = 0; plot < town.plots; plot++) layer.append(houseHandle(plot, town.buildings.find(b => b.plot === plot)));
    positionTargets(root);
  };
}

function houseHandle(plot: number, house?: Building) {
  const button = document.createElement('button'); button.className = 'house-handle'; button.dataset.plot = String(plot);
  button.dataset.worldX = String(plotStart(plot) + 220); button.dataset.worldY = '195';
  button.textContent = house ? `↔ ${house.name}` : '＋ Casa';
  button.setAttribute('aria-label', house ? `Mover ${house.name}` : `Construir no terreno ${plot + 1}`);
  if (house) button.dataset.house = String(house.id);
  button.title = house ? 'Arraste para outro terreno ou toque para ver as ações da casa.' : 'Escolher uma casa pronta';
  return button;
}
