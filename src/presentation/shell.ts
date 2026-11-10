import { uiText } from '../content/ui-text';
const trayIcons: Record<string, string> = { [uiText.tray.cast]: 'toybox', [uiText.tray.furniture]: 'catalog', [uiText.tray.street]: 'plot', [uiText.tray.rooms]: 'blocks' };
export function createShell(root: HTMLElement, cancel: () => void) {
  const context = root.querySelector('#actor-context')!;
  const contextToggle = root.querySelector<HTMLButtonElement>('#context-toggle')!;
  contextToggle.onclick = () => {
    const folded = context.classList.toggle('folded');
    contextToggle.setAttribute('aria-expanded', String(!folded));
    contextToggle.textContent = folded ? 'Abrir ações' : 'Recolher ações';
  };
  let constructing = false; let building = false; let opened = false; let street = false;
  const play = root.querySelector<HTMLElement>('#play-tray')!;
  const streetTray = root.querySelector<HTMLElement>('#street-tray')!;
  const catalog = root.querySelector<HTMLElement>('#build-catalog')!;
  const toggle = root.querySelector<HTMLButtonElement>('#tray-toggle')!;
  function render() {
    root.classList.toggle('tray-open', opened);
    root.querySelector<HTMLElement>('#create-tabs')!.hidden = !building;
    play.hidden = building || !opened; catalog.hidden = !building || !opened || street || constructing;
    root.querySelector<HTMLElement>('#construction-tray')!.hidden = !constructing || !opened;
    streetTray.hidden = !building || !opened || !street || constructing;
    toggle.textContent = trayLabel(building, street, constructing);
    toggle.style.setProperty('--button-icon', `url('/icons/ui-${trayIcons[toggle.textContent]}.svg')`);
    toggle.setAttribute('aria-expanded', String(opened));
  }
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { opened = false; render(); } });
  toggle.addEventListener('click', () => { cancel(); opened = !opened; render(); });
  const tabs = root.querySelectorAll<HTMLButtonElement>('[data-play-tab]');
  function tab(id: string) {
    opened = true; render();
    tabs.forEach(b => {
      const active = b.dataset.playTab === id; b.setAttribute('aria-pressed', String(active));
      root.querySelector<HTMLElement>(`#${b.dataset.playTab}`)!.hidden = !active;
    });
  }
  tabs.forEach(b => b.addEventListener('click', () => tab(b.dataset.playTab!)));
  return {
    mode(value: boolean, outside = false, construction = false) { if (construction && !constructing) opened = true; constructing = construction; street = outside; if (building !== value) { building = value; opened = value; } render(); },
    open() { opened = !street; render(); },
    close() { opened = false; render(); },
    looks() { tab('looks'); },
    playTab(id: string) { tab(id); },
  };
}

function trayLabel(building: boolean, street: boolean, constructing: boolean) {
  if (constructing) return uiText.tray.rooms;
  return building ? (street ? uiText.tray.street : uiText.tray.furniture) : uiText.tray.cast;
}
