import { expect, it } from 'vitest';
import { initialWorld, transition } from './world';
import { initialAlbum, duplicateHouse } from './houses';
import { migrateNeighborhood, neighborhoodAction, localWorld, storeWorld } from './neighborhood';
it('migra casas com IDs locais iguais sem perder objetos ou duplicar a turma', () => {
  const world = transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'microfone' }).state;
  const album = duplicateHouse(initialAlbum(world), false);
  const town = migrateNeighborhood(album);
  expect(town.actors).toHaveLength(7); expect(town.items).toHaveLength(8);
  expect(new Set(town.items.map(i => i.id)).size).toBe(8);
  expect(town.items.filter(i => i.holder)).toHaveLength(1);
  expect(town.items.find(i => i.id === '1:microfone')!.holder).toBeNull();
  expect(town.buildings.map(b => b.layout)).toEqual(album.houses.map(h => h.state.layout));
  expect(town.plots).toBe(4);
});
it('leva personagem e objeto entre locais sem duplicação, visita não transporta', () => {
  let town = migrateNeighborhood(initialAlbum(transition(initialWorld(), { type: 'pick', actor: 'bia', item: 'microfone' }).state));
  const street = { kind: 'street' } as const;
  const visited = neighborhoodAction(town, { type: 'visit', location: street });
  expect(visited.actors).toEqual(town.actors);
  town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: street, point: { x: 300, y: 520 } });
  expect(town.actors[0]!.location).toEqual(street);
  expect(town.items.find(i => i.holder === 'bia')!.location).toEqual(street);
  expect(town.items).toHaveLength(4);
  expect(localWorld(town).actors[0]!.room).toBe('sala');
});
it('constrói modelos, expande terrenos e duplica decoração sem a turma', () => {
  let town = migrateNeighborhood(initialAlbum(initialWorld()));
  for (const [plot, model] of [[1, 'shop'], [2, 'apartment'], [3, 'house']] as const) town = neighborhoodAction(town, { type: 'construct', plot, model });
  expect(town.plots).toBe(6); expect(town.actors).toHaveLength(7);
  expect(Object.keys(town.buildings[2]!.layout.rooms)).toHaveLength(3);
  expect(neighborhoodAction(town, { type: 'construct', plot: 0, model: 'shop' })).toBe(town);
  const copy = neighborhoodAction(town, { type: 'duplicate', building: 1 });
  expect(copy.actors).toEqual(town.actors); expect(copy.buildings).toHaveLength(5);
});
it('projeção e edição conservam locais externos e nomes', () => {
  const town = migrateNeighborhood(duplicateHouse(initialAlbum(initialWorld()), false));
  const world = localWorld(town);
  const next = storeWorld(town, transition(world, { type: 'name', actor: 'mimi', name: 'Lua' }).state);
  expect(next.actors[4]!.name).toBe('Lua'); expect(next.items).toEqual(town.items);
  expect(next.buildings[0]).toEqual(town.buildings[0]);
});
it('objetos do mesmo tipo podem coexistir e ser usados individualmente em outra casa', () => {
  let town = migrateNeighborhood(duplicateHouse(initialAlbum(initialWorld()), false));
  town = neighborhoodAction(town, { type: 'transport', item: '2:microfone', location: { kind: 'interior', building: 1, room: 'sala' }, point: { x: 620, y: 440 } });
  expect(localWorld(town).items.filter(i => i.kind === 'microfone')).toHaveLength(2);
  town = storeWorld(town, transition(localWorld(town), { type: 'travel', actor: 'bia', room: 'sala' }).state);
  town = storeWorld(town, transition(localWorld(town), { type: 'give', actor: 'bia', item: '2:microfone' }).state);
  expect(town.items.find(i => i.id === '2:microfone')!.holder).toBe('bia');
  expect(town.items.find(i => i.id === '1:microfone')!.holder).toBeNull();
  expect(localWorld(town).show).toBe(true);
});
it('fachada, locais inválidos, modelos e cópias mantêm limites e entrada estável', () => {
  let town = migrateNeighborhood(initialAlbum(initialWorld()));
  for (const plot of [-1, 4, .5]) expect(neighborhoodAction(town, { type: 'construct', plot, model: 'shop' })).toBe(town);
  expect(neighborhoodAction(town, { type: 'duplicate', building: 999 })).toBe(town);
  expect(neighborhoodAction(town, { type: 'visit', location: { kind: 'interior', building: 999, room: 'sala' } })).toBe(town);
  town = neighborhoodAction(town, { type: 'facade', building: 1, name: '  Casa azul  ', color: 'sky' });
  expect(town.buildings[0]).toMatchObject({ name: 'Casa azul', color: 'sky', entry: 'sala' });
  const blank = neighborhoodAction(town, { type: 'facade', building: 1, name: ' ' });
  expect(blank.buildings[0]!.name).toBe('Casa azul');
  town = neighborhoodAction(town, { type: 'visit', location: { kind: 'street' } });
  const copy = neighborhoodAction(town, { type: 'duplicate', building: 1 });
  expect(copy.location).toEqual({ kind: 'street' }); expect(copy.buildings[1]!.layout).toEqual(town.buildings[0]!.layout);
});
it('recusa transporte ausente, destino inválido e posições fora do limite', () => {
  const town = migrateNeighborhood(initialAlbum(initialWorld()));
  for (const point of [{ x: 59, y: 500 }, { x: 1761, y: 500 }, { x: 300, y: 541 }, { x: NaN, y: 500 }]) {
    expect(neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point })).toBe(town);
  }
  expect(neighborhoodAction(town, { type: 'transport', item: '2:ursinho', location: { kind: 'street' }, point: { x: 200, y: 500 } })).toBe(town);
  expect(neighborhoodAction(town, { type: 'transport', actor: 'bia', item: '1:ursinho', location: { kind: 'street' }, point: { x: 200, y: 500 } })).toBe(town);
  expect(neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'interior', building: 99, room: 'sala' }, point: { x: 200, y: 500 } })).toBe(town);
});
it('moradores distantes na rua não impedem decorar outro ambiente', async () => {
  const { editWorld } = await import('./design');
  let town = migrateNeighborhood(initialAlbum(initialWorld()));
  town = neighborhoodAction(town, { type: 'transport', actor: 'bia', location: { kind: 'street' }, point: { x: 1600, y: 520 } });
  town = neighborhoodAction(town, { type: 'visit', location: { kind: 'interior', building: 1, room: 'sala' } });
  const world = localWorld(town), sofa = world.layout.pieces.find(p => p.kind === 'sofa')!;
  const next = storeWorld(town, editWorld(world, { type: 'move', id: sofa.id, point: { x: sofa.x + 20, y: sofa.y } }));
  expect(next.buildings[0]!.layout.pieces.find(p => p.id === sofa.id)!.x).toBe(sofa.x + 20);
  expect(next.actors[0]!.x).toBe(1600);
});
it('guardar alimentos trazidos de outras casas usa posições válidas da geladeira', async () => {
  const { validPoint } = await import('./geometry');
  let town = migrateNeighborhood(duplicateHouse(initialAlbum(initialWorld()), false));
  const world = localWorld(town); world.items = world.items.map(i => ({ ...i, spot: 'floor' as const })); town = storeWorld(town, world);
  for (const item of ['2:lanche', '2:peixe'] as const) {
    town = neighborhoodAction(town, { type: 'visit', location: { kind: 'interior', building: 2, room: 'sala' } });
    town = neighborhoodAction(town, { type: 'transport', item, location: { kind: 'interior', building: 1, room: 'sala' }, point: { x: 650, y: 500 } });
    town = storeWorld(town, transition(localWorld(town), { type: 'put', item, spot: 'fridge' }).state);
    const stored = town.items.find(i => i.id === item)!;
    expect(stored.spot).toBe('fridge'); expect(validPoint(stored)).toBe(true);
    expect(stored.y).toBe(item === '2:lanche' ? 310 : 360);
  }
});
it('preserva ambientes locais homônimos, posições, roupas e decoração de várias casas', async () => {
  const { addRoom } = await import('./rooms');
  const { editWorld } = await import('./design');
  const { decodeNeighborhood, encodeNeighborhood } = await import('../persistence/neighborhood');
  let album = duplicateHouse(initialAlbum(initialWorld()), false);
  album = { ...album, houses: album.houses.map((house, index) => {
    let state = addRoom(house.state, { name: `Ateliê ${index}`, template: 'empty', size: 'large', cell: 2 });
    state = transition(state, { type: 'travel', actor: 'bia', room: 'room-3' }).state;
    state = transition(state, { type: 'dress', actor: 'bia', look: index ? 'mira' : 'zoey' }).state;
    state = transition(state, { type: 'move', actor: 'bia', point: { x: 350 + index * 200, y: 480 } }).state;
    state = transition(state, { type: 'room', room: 'sala' }).state;
    state = transition(state, { type: 'transfer', item: 'microfone', room: 'room-3', point: { x: 300 + index * 200, y: 400 } }).state;
    state = transition(state, { type: 'pick', actor: 'bia', item: 'microfone' }).state;
    state = editWorld(state, { type: 'add', kind: 'plant', point: { x: 200 + index * 200, y: 400 } });
    state = editWorld(state, { type: 'finish', surface: 'wall', value: index ? 'mint' : 'rose' });
    return { ...house, state };
  }) };
  const town = migrateNeighborhood(album);
  expect(town.actors[0]).toMatchObject({ look: 'mira', x: 550, y: 480, location: { kind: 'interior', building: 2, room: 'room-3' } });
  expect(town.buildings[0]!.layout.rooms['room-3']!.wall).toBe('rose');
  expect(town.buildings[1]!.layout.rooms['room-3']!.wall).toBe('mint');
  expect(town.items.find(i => i.id === '1:microfone')).toMatchObject({ holder: null, x: 350, y: 480, spot: 'floor', location: { kind: 'interior', building: 1, room: 'room-3' } });
  expect(town.items.find(i => i.id === '2:microfone')!.holder).toBe('bia');
  expect(town.buildings.map(b => b.layout.pieces)).toEqual(album.houses.map(h => h.state.layout.pieces));
  expect(decodeNeighborhood(encodeNeighborhood(town))).toEqual(town);
});
