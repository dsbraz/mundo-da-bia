export function buttonArt(root: HTMLElement) {
  const icons: Record<string, string> = { 'map-toggle': 'home', 'play-mode': 'play', 'construct-mode': 'home', 'build-toggle': 'brush', 'tray-toggle': 'plus', 'wardrobe-toggle': 'looks', 'bring-here': 'cast', undo: 'undo', redo: 'undo', 'flip-piece': 'flip', 'remove-piece': 'drop', 'sound-toggle': 'sound', gather: 'cast', 'add-room': 'plus' };
  Object.entries(icons).forEach(([id, icon]) => decorate(root.querySelector<HTMLButtonElement>(`#${id}`)!, icon));
  root.querySelectorAll<HTMLButtonElement>('[data-play-tab]').forEach(b => decorate(b, b.dataset.playTab!));
  const categories: Record<string, string> = { all: 'furniture', living: 'furniture', kitchen: 'food', bedroom: 'rest', bathroom: 'colors', garden: 'decor', activities: 'sound', finishes: 'colors' };
  root.querySelectorAll<HTMLButtonElement>('[data-category-filter]').forEach(b => decorate(b, categories[b.dataset.categoryFilter!]!));
  root.querySelectorAll<HTMLButtonElement>('#actions button').forEach((b, i) => decorate(b, ['food', 'rest', 'drop', 'sound'][i]!));
}
function decorate(button: HTMLButtonElement, icon: string) { button.classList.add('illustrated'); button.style.setProperty('--button-icon', `url('/icons/ui-${icon}.svg')`); }
