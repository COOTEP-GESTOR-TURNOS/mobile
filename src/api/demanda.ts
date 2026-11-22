import { pedir } from './http';
import { agregarFiltros, type FiltrosAnalitica } from './filtrosAnalitica';
import type { IndicadoresAgencia, ValoresIndicadores } from './indicadores';

const TIPOS_EVENTO = {
  FESTIVO_LOCAL: 'Festivo local',
  PAGO_SUBSIDIO_FAMILIAR: 'Pago de subsidio familiar',
  PAGO_NOMINA: 'Pago de nómina',
} as const;

export type NivelDemanda = 'BAJA' | 'MEDIA' | 'ALTA';

export interface DiaDemanda {
  fecha: string;
  diaHabil: boolean;
  finDeSemana: boolean;
  festivoNacional: string | null;
  festivosPutumayo: string[];
  vencimientoCredito: boolean;
  eventos: { id: string; fecha: string; tipo: keyof typeof TIPOS_EVENTO; agenciaId?: string; agenciaNombre?: string }[];
  turnosRegistrados: number | null;
  turnosEstimados: number | null;
  nivelDemanda: NivelDemanda | null;
}

export interface CalendarioDemanda {
  agenciaId: string | null;
  mes: string;
  fuente: 'REAL' | 'SIMULADA';
  estadoPronostico: 'DISPONIBLE' | 'HISTORIAL_INSUFICIENTE' | 'SOLO_CALENDARIO' | 'INCOMPLETO';
  dias: DiaDemanda[];
}

export interface TableroMensual {
  fuente: CalendarioDemanda['fuente'];
  actualizadoEn: string | null;
  desde: string;
  hasta: string;
  resumen: ValoresIndicadores;
  agencias: IndicadoresAgencia[];
  calendario: CalendarioDemanda;
}

export const demandaApi = {
  tablero: (mes: string, agenciaId: string, filtros?: Omit<FiltrosAnalitica, 'agenciaId'>) => {
    const consulta = agregarFiltros(new URLSearchParams({ mes }), { agenciaId, ...filtros });
    return pedir<TableroMensual>('GET', `/analitica/tablero?${consulta}`);
  },
  consultar: (agenciaId: string, mes: string, servicioId?: string) =>
    pedir<CalendarioDemanda>('GET', `/analitica/agencias/${encodeURIComponent(agenciaId)}/demanda?${agregarFiltros(new URLSearchParams({ mes }), { servicioId })}`),
};

const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const niveles: Record<NivelDemanda, string> = { BAJA: 'Baja', MEDIA: 'Media', ALTA: 'Alta' };

/** Opera sobre fechas civiles sin desplazarlas a la zona horaria del teléfono. */
export function mesDesplazado(mes: string, desplazamiento: number): string {
  const fecha = new Date(`${mes}-01T00:00:00Z`);
  fecha.setUTCMonth(fecha.getUTCMonth() + desplazamiento);
  return fecha.toISOString().slice(0, 7);
}

export const nombreMes = (mes: string): string => `${meses[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
export const nombreFecha = (fecha: string): string => `${Number(fecha.slice(8, 10))} de ${nombreMes(fecha.slice(0, 7))}`;
export const huecosDelMes = (mes: string): number => (new Date(`${mes}-01T00:00:00Z`).getUTCDay() + 6) % 7;
export const nombreNivel = (nivel: NivelDemanda): string => niveles[nivel];

export function resumenDia(dia: DiaDemanda, hoy: string): string {
  const cifras: string[] = [];
  if (dia.diaHabil === false) cifras.push('Día no hábil');
  if (dia.turnosRegistrados !== null) cifras.push(`${dia.turnosRegistrados.toLocaleString('es-CO')} turnos registrados`);
  if (dia.diaHabil !== false && dia.turnosEstimados !== null) {
    const nivel = dia.nivelDemanda ? ` · Demanda ${nombreNivel(dia.nivelDemanda).toLowerCase()}` : '';
    cifras.push(`${dia.turnosEstimados.toLocaleString('es-CO')} turnos estimados${nivel}`);
  }
  return cifras.length ? cifras.join(' · ') : dia.fecha < hoy ? 'Sin historial' : 'Sin pronóstico';
}

export function marcasDia(dia: DiaDemanda): string[] {
  return [
    ...(dia.finDeSemana ? ['Fin de semana'] : []),
    ...(dia.festivoNacional ? [`Festivo nacional · ${dia.festivoNacional}`] : []),
    ...dia.festivosPutumayo.map((nombre) => `Día cívico de Putumayo · ${nombre}`),
    ...(dia.vencimientoCredito ? ['Vencimiento de crédito'] : []),
    ...dia.eventos.map((evento) => [TIPOS_EVENTO[evento.tipo], evento.agenciaNombre].filter(Boolean).join(' · ')),
  ];
}

export function horaCorte(instante: string): string {
  return new Date(instante).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' });
}
