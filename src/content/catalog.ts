import type { ActorId, ItemKind, LookId } from '../domain/types';
export const actors: Record<ActorId, { name: string; skin: number; hair: number }> = {
  bia: { name: 'Bia', skin: 0xf3d5bf, hair: 0xe8c56c },
  luna: { name: 'Luna', skin: 0x9e6047, hair: 0x302531 },
  leo: { name: 'Léo', skin: 0xf3c9a3, hair: 0xa16539 },
  rui: { name: 'Rui', skin: 0xc88961, hair: 0x3d302c },
  mimi: { name: 'Mimi', skin: 0xe9a35e, hair: 0x925833 },
  nino: { name: 'Nino', skin: 0x59536e, hair: 0x29253c },
  pipoca: { name: 'Pipoca', skin: 0xfff6dc, hair: 0xb09d85 },
};
export const looks: Record<LookId, { name: string; color: number }> = {
  nurse: { name: 'Enfermagem', color: 0x76aaa6 }, police: { name: 'Polícia', color: 0x687f9e },
  detective: { name: 'Detetive', color: 0xb39a79 }, office: { name: 'Escritório', color: 0x83968d },
  sport: { name: 'Esporte', color: 0xc18b6c }, outing: { name: 'Passeio', color: 0x9baabc },
  chef: { name: 'Chef de cozinha', color: 0xf1e6cc }, doctor: { name: 'Veterinária e médico', color: 0xa1c7c0 },
  gardener: { name: 'Jardinagem', color: 0x89a778 }, builder: { name: 'Construtor e construtora', color: 0xe9af54 },
  spiderman: { name: 'Homem-Aranha', color: 0xcf514d },
  superman: { name: 'Superman', color: 0x538fbb },
  rumi: { name: 'Rumi', color: 0xf7cd42 },
  mira: { name: 'Mira', color: 0xf3d044 },
  zoey: { name: 'Zoey', color: 0x73bbd7 },
  denim: { name: 'Jaqueta jeans', color: 0x668ca8 },
  rehearsal: { name: 'Ensaio pop', color: 0x9c83b6 },
  overalls: { name: 'Macacão criativo', color: 0xc39965 },
  neon: { name: 'Estrela Neon', color: 0x9771cf },
  aurora: { name: 'Guardiã Aurora', color: 0x47bcb2 },
  sol: { name: 'Dia de sol', color: 0xf4bf54 },
  jardim: { name: 'Jardim', color: 0x84b8a1 },
  estrela: { name: 'Estrelinha', color: 0x9a86c8 },
  mar: { name: 'Onda azul', color: 0x6aa9cb },
  festa: { name: 'Festa', color: 0xe889a1 },
  pijama: { name: 'Pijama', color: 0xa9b5db },
};
export const rooms: Record<'sala' | 'quarto', { name: string }> = {
  sala: { name: 'Sala & palco' }, quarto: { name: 'Quarto dos sonhos' },
};
export const items: Record<ItemKind, { name: string }> = {
  bola: { name: 'Bola da praça' },
  lanche: { name: 'Lanche' }, peixe: { name: 'Comidinha de gato' },
  microfone: { name: 'Microfone' }, ursinho: { name: 'Ursinho' },
  prato: { name: 'Prato' }, estetoscopio: { name: 'Estetoscópio' }, curativo: { name: 'Curativo' }, regador: { name: 'Regador' },
  lanterna: { name: 'Lanterna' }, colher: { name: 'Colher de pau' }, cesta: { name: 'Cesta' },
};
