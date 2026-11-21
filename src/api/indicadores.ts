import { pedir } from './http';
import { agregarFiltros, type FiltrosAnalitica, type RangoAnalitica } from './filtrosAnalitica';
import { fechaColombia } from './recomendaciones';

export interface ValoresIndicadores {
  solicitados?: number | null;
  pendientes?: number | null;
  atendidos: number;
  cancelados: number;
  ausentes: number;
  esperaPromedioMin: number;
  atencionPromedioMin: number;
  proporcionPreferencial: number;
}

export interface IndicadoresAgencia extends ValoresIndicadores {
  agenciaId: string;
  nombre: string;
  disponible: boolean;
}

export interface TableroIndicadores {
  desde: string;
  hasta: string;
  ambito: 'GLOBAL' | 'AGENCIA';
  agencias: IndicadoresAgencia[];
  total: ValoresIndicadores;
}

/** RF-19: el mismo endpoint de la web; el backend aplica el ámbito del administrador. */
export const indicadoresApi = {
  consultar: ({ desde, hasta, ...filtros }: RangoAnalitica & FiltrosAnalitica) => {
    const consulta = agregarFiltros(new URLSearchParams({ desde, hasta }), filtros);
    return pedir<TableroIndicadores>('GET', `/indicadores?${consulta}`);
  },
};

/** Últimos n días hasta hoy, con la fecha de Colombia. */
export function ultimosDias(dias: number, ahora = new Date()): RangoAnalitica {
  return { desde: fechaColombia(-(dias - 1), ahora), hasta: fechaColombia(0, ahora) };
}

export function totalTurnos(v: ValoresIndicadores): number {
  return v.atendidos + v.cancelados + v.ausentes;
}

export function porcentaje(parte: number, base: number): string {
  return base ? `${Math.round((parte / base) * 100)} %` : '0 %';
}
