import { uiText } from '../content/ui-text';
const trayIcons: Record<string, string> = { [uiText.tray.cast]: 'toybox', [uiText.tray.furniture]: 'catalog', [uiText.tray.street]: 'plot', [uiText.tray.rooms]: 'blocks' };
/** The Turma drawer (W3L-03) overlays the scene, closed unless the child left it open (`drawer`); the action ring's "mais" shows the rest. */
export function createShell(root: HTMLElement, cancel: () => void, drawer: { open: boolean; remember: (open: boolean) => void } = { open: false, remember: () => {} }) {
  const context = root.querySelector('#actor-context')!, more = root.querySelector<HTMLButtonElement>('#more-actions')!;
  more.onclick = () => { more.setAttribute('aria-expanded', String(context.classList.toggle('more'))); };
  let constructing = false; let building = false; let opened = drawer.open; let street = false; let playOpen = drawer.open;
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
    toggle.setAttribute('aria-expanded', String(opened)); toggle.classList.remove('cast-stack');
    if (!building) playDrawer();
  }
  function playDrawer() {
    toggle.classList.add('cast-stack'); toggle.prepend(castStack());
    if (playOpen !== opened) { playOpen = opened; drawer.remember(opened); }
  }
  render();
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
    mode(value: boolean, outside = false, construction = false) { if (construction && !constructing) opened = true; constructing = construction; street = outside; if (building !== value) { building = value; opened = value || playOpen; } render(); },
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
/** Three stacked portraits on the Turma button: who is in the drawer, without reading. */
function castStack() {
  const stack = document.createElement('span'); stack.className = 'stack'; stack.setAttribute('aria-hidden', 'true');
  for (const id of ['luna', 'leo', 'bia']) { const face = document.createElement('img'); face.src = `/icons/${id}.svg`; face.alt = ''; stack.append(face); }
  return stack;
}
