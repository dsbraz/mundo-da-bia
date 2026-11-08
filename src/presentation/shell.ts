export function createShell(root: HTMLElement, cancel: () => void) {
  let building = false; let opened = false; let street = false;
  const play = root.querySelector<HTMLElement>('#play-tray')!;
  const streetTray = root.querySelector<HTMLElement>('#street-tray')!;
  const catalog = root.querySelector<HTMLElement>('#build-catalog')!;
  const toggle = root.querySelector<HTMLButtonElement>('#tray-toggle')!;
  function render() {
    root.classList.toggle('tray-open', opened);
    play.hidden = building || !opened; catalog.hidden = !building || !opened || street;
    streetTray.hidden = !building || !opened || !street;
    toggle.textContent = building ? (street ? 'Construir' : 'Móveis e cores') : 'Turma e objetos';
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
    root.querySelector<HTMLElement>('#bring-here')!.hidden = id !== 'cast';
  }
  tabs.forEach(b => b.addEventListener('click', () => tab(b.dataset.playTab!)));
  return {
    mode(value: boolean, outside = false) { street = outside; if (building !== value) { building = value; opened = false; } render(); },
    close() { opened = false; render(); },
    looks() { tab('looks'); },
    playTab(id: string) { tab(id); },
  };
}
