import { pedir } from './http';
import { fechaColombia } from './recomendaciones';

export interface ValoresIndicadores {
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
  consultar: (dias: number) =>
    pedir<TableroIndicadores>('GET', `/indicadores?${new URLSearchParams({ desde: fechaColombia(-(dias - 1)), hasta: fechaColombia(0) }).toString()}`),
};

export function totalTurnos(v: ValoresIndicadores): number {
  return v.atendidos + v.cancelados + v.ausentes;
}

export function porcentaje(parte: number, base: number): string {
  return base ? `${Math.round((parte / base) * 100)} %` : '0 %';
}
