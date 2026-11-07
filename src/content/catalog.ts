import type { ActorId, ItemId, LookId, RoomId } from '../domain/types';
export const actors: Record<ActorId, { name: string; skin: number; hair: number }> = {
  bia: { name: 'Bia', skin: 0xd79b70, hair: 0xf5bf38 },
  luna: { name: 'Luna', skin: 0x9e6047, hair: 0x302531 },
  leo: { name: 'Léo', skin: 0xf3c9a3, hair: 0xa16539 },
  rui: { name: 'Rui', skin: 0xc88961, hair: 0x3d302c },
  mimi: { name: 'Mimi', skin: 0xe9a35e, hair: 0x925833 },
  nino: { name: 'Nino', skin: 0x59536e, hair: 0x29253c },
  pipoca: { name: 'Pipoca', skin: 0xfff6dc, hair: 0xb09d85 },
};
export const looks: Record<LookId, { name: string; color: number; icon: string }> = {
  neon: { name: 'Estrela Neon', color: 0x9771cf, icon: 'ϟ' },
  aurora: { name: 'Guardiã Aurora', color: 0x47bcb2, icon: '✦' },
  sol: { name: 'Dia de sol', color: 0xf4bf54, icon: '☀' },
  jardim: { name: 'Jardim', color: 0x84b8a1, icon: '✿' },
  estrela: { name: 'Estrelinha', color: 0x9a86c8, icon: '★' },
  mar: { name: 'Onda azul', color: 0x6aa9cb, icon: '≈' },
  festa: { name: 'Festa', color: 0xe889a1, icon: '♥' },
  pijama: { name: 'Pijama', color: 0xa9b5db, icon: '☾' },
};
export const rooms: Record<RoomId, { name: string; icon: string }> = {
  sala: { name: 'Sala & palco', icon: '♫' }, quarto: { name: 'Quarto dos sonhos', icon: '☾' },
};
export const items: Record<ItemId, { name: string }> = {
  lanche: { name: 'Lanche' }, peixe: { name: 'Comidinha de gato' },
  microfone: { name: 'Microfone' }, ursinho: { name: 'Ursinho' },
};
