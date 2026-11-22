import { pedir } from './http';

export interface RangoAnalitica {
  desde: string;
  hasta: string;
}

export interface FiltrosAnalitica {
  agenciaId?: string;
  servicioId?: string;
  colaboradorId?: string;
}

export interface OpcionAnalitica {
  id: string;
  nombre: string;
}

export interface ColaboradorAnalitica extends OpcionAnalitica {
  agenciaIds: string[];
}

export interface OpcionesAnalitica {
  servicios: OpcionAnalitica[];
  colaboradores: ColaboradorAnalitica[];
}

export function agregarFiltros(consulta: URLSearchParams, filtros: FiltrosAnalitica): URLSearchParams {
  if (filtros.agenciaId) consulta.set('agenciaId', filtros.agenciaId);
  if (filtros.servicioId) consulta.set('servicioId', filtros.servicioId);
  if (filtros.colaboradorId) consulta.set('colaboradorId', filtros.colaboradorId);
  return consulta;
}

export function rangoDelMes(mes: string): RangoAnalitica {
  const desde = `${mes}-01`;
  const ultimoDia = new Date(`${desde}T00:00:00Z`);
  ultimoDia.setUTCMonth(ultimoDia.getUTCMonth() + 1, 0);
  return { desde, hasta: ultimoDia.toISOString().slice(0, 10) };
}

export const filtrosAnaliticaApi = {
  consultar: ({ desde, hasta, agenciaId, servicioId }: RangoAnalitica & Pick<FiltrosAnalitica, 'agenciaId' | 'servicioId'>) => {
    const consulta = agregarFiltros(new URLSearchParams({ desde, hasta }), { agenciaId, servicioId });
    return pedir<OpcionesAnalitica>('GET', `/analitica/filtros?${consulta}`);
  },
};
