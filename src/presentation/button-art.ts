// Every visible button has its own icon: no two buttons on screen at the same time share one.
const icons: Record<string, string> = { 'map-toggle': 'map', 'play-mode': 'play', 'build-toggle': 'brush', 'decorate-mode': 'decorate', 'construct-mode': 'enlarge', undo: 'undo', redo: 'redo', 'flip-piece': 'flip', 'remove-piece': 'drop', 'sound-toggle': 'sound', gather: 'gather', 'add-room': 'room-plus', 'context-toggle': 'panel-fold', 'game-stop': 'stop' };
const homeTabs: Record<string, string> = { map: 'home', organize: 'organize', ideas: 'ideas' };
const categories: Record<string, string> = { all: 'all', living: 'furniture', kitchen: 'food', bedroom: 'rest', bathroom: 'bath', garden: 'decor', activities: 'activities', finishes: 'colors' };
export function buttonArt(root: HTMLElement) {
  Object.entries(icons).forEach(([id, icon]) => decorate(root.querySelector<HTMLButtonElement>(`#${id}`)!, icon));
  decorate(root.querySelector<HTMLButtonElement>('#tray-toggle')!, 'toybox');
  root.querySelectorAll<HTMLButtonElement>('[data-play-tab]').forEach(b => decorate(b, b.dataset.playTab!));
  root.querySelectorAll<HTMLButtonElement>('.home-tabs [data-home-tab]').forEach(b => decorate(b, homeTabs[b.dataset.homeTab!]!));
  root.querySelectorAll<HTMLButtonElement>('[data-category-filter]').forEach(b => decorate(b, categories[b.dataset.categoryFilter!]!));
}
function decorate(button: HTMLButtonElement, icon: string) { button.classList.add('illustrated'); button.style.setProperty('--button-icon', `url('/icons/ui-${icon}.svg')`); }
