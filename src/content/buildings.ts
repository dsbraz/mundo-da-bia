import type { BuildingModel } from '../domain/neighborhood-types';
export const buildingChoices: Record<BuildingModel, { name: string; description: string; preview: string; group: 'homes' | 'services' | 'sports' }> = {
  house: { name: 'Casa', description: 'sala e quarto', preview: 'Casa com sala e quarto', group: 'homes' },
  apartment: { name: 'Prédio', description: 'entrada e dois ambientes', preview: 'Prédio com dois andares', group: 'homes' },
  shop: { name: 'Loja', description: 'salão e fundos', preview: 'Loja com salão e fundos', group: 'services' },
  hospital: { name: 'Hospital', description: 'recepção, consultório e enfermaria', preview: 'Hospital com três ambientes', group: 'services' },
  police: { name: 'Delegacia', description: 'ajuda e achados e perdidos', preview: 'Delegacia com três ambientes', group: 'services' },
  office: { name: 'Escritório', description: 'trabalho, reunião e copa', preview: 'Escritório com quatro ambientes', group: 'services' },
  'fire-station': { name: 'Bombeiros', description: 'central, descanso e copa', preview: 'Bombeiros com três ambientes', group: 'services' },
  school: { name: 'Escola', description: 'sala de aula, biblioteca e pátio', preview: 'Escola com quatro ambientes', group: 'services' },
  stadium: { name: 'Estádio', description: 'campo, aquecimento e lanchonete', preview: 'Estádio com três ambientes', group: 'sports' },
  'sports-club': { name: 'Clube esportivo', description: 'recepção, ginásio e brincadeiras', preview: 'Clube esportivo com três ambientes', group: 'sports' },
};
/** The shop's Mercado plan (W3L-21): its own card, right after the shop. */
export const marketChoice = { name: 'Mercado', description: 'prateleiras, geladeira e caixa', preview: 'Mercado com prateleiras e caixa', group: 'services' as const };
