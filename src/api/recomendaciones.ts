import { pedir } from './http';

export interface FranjaRecomendada {
  desde: string;
  hasta: string;
  esperaMedianaMin: number;
  turnos: number;
}

export interface RecomendacionHorario {
  agenciaId: string;
  servicioId: string;
  fecha: string;
  tipoDia: string | null;
  horario: { apertura: string; cierre: string };
  disponible: boolean;
  franjas: FranjaRecomendada[];
}

/** RF-10: el mismo endpoint de la web. */
export const recomendacionesApi = {
  consultar: (agenciaId: string, servicioId: string, fecha: string) =>
    pedir<RecomendacionHorario>('GET', `/recomendaciones?${new URLSearchParams({ agenciaId, servicioId, fecha }).toString()}`),
};

/**
 * Fecha AAAA-MM-DD en Colombia, hoy (0) o dentro de n días. Colombia está siempre en UTC−5, así
 * que se resta el desfase sin depender del soporte de zonas horarias de Intl en el teléfono.
 */
export function fechaColombia(dias = 0, ahora = new Date()): string {
  return new Date(ahora.getTime() - 5 * 3_600_000 + dias * 86_400_000).toISOString().slice(0, 10);
}

export function textoEspera(minutos: number): string {
  return minutos < 1 ? 'menos de 1 min de espera' : `unos ${Math.round(minutos)} min de espera`;
}
