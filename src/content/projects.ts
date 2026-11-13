import type { PieceKind, RoomTemplate } from '../domain/types';
export const projects: { id: string; title: string; description: string; rooms: RoomTemplate[]; pieces: PieceKind[] }[] = [
  { id: 'band', title: 'Apartamento da banda', description: 'Um lugar para criar músicas, experimentar figurinos e descansar depois do show.', rooms: ['studio', 'bedroom'], pieces: ['speaker', 'mirror', 'bed'] },
  { id: 'cafe', title: 'Café com gatos', description: 'Imagine o cardápio, organize as mesas e reserve um canto para os gatos.', rooms: ['kitchen', 'garden'], pieces: ['counter', 'table', 'cat-bed'] },
  { id: 'sleepover', title: 'Noite entre amigos', description: 'Crie um quarto de hóspedes e prepare um espaço para conversar até tarde.', rooms: ['bedroom'], pieces: ['bed', 'sofa', 'cushion'] },
];
export const templates: Record<RoomTemplate, { name: string }> = {
  classroom: { name: 'Sala de aula' }, sportsfield: { name: 'Campo' }, gym: { name: 'Ginásio' },
  reception: { name: 'Recepção' },
  consultation: { name: 'Consultório' },
  ward: { name: 'Enfermaria' },
  dispatch: { name: 'Central de atendimento' },
  investigation: { name: 'Achados e perdidos' },
  office: { name: 'Escritório' },
  meeting: { name: 'Sala de reunião' },
  breakroom: { name: 'Copa' },
  playground: { name: 'Quintal de brincadeiras' },
  laundry: { name: 'Lavanderia' }, library: { name: 'Biblioteca' }, dining: { name: 'Sala de jantar' },
  empty: { name: 'Livre' }, bedroom: { name: 'Quarto' }, kitchen: { name: 'Cozinha' },
  bathroom: { name: 'Banheiro' }, studio: { name: 'Estúdio' }, garden: { name: 'Jardim' }, market: { name: 'Mercado' },
};
