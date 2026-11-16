import { pedir } from './http';

/** RF-06: catálogo real de PostgreSQL (GET /api/v1/agencias). Mismas reglas que la web. */
export interface ServicioCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  prefijo: string;
  ventanillas: number;
}

export interface AgenciaCatalogo {
  id: string;
  codigo: string;
  nombre: string;
  municipio: string;
  activa: boolean;
  servicios: ServicioCatalogo[];
}

export const catalogoApi = {
  agencias: () => pedir<AgenciaCatalogo[]>('GET', '/agencias'),
};

/** Agencias donde se puede pedir turno: activas y con al menos un servicio. */
export function agenciasAbiertas(agencias: AgenciaCatalogo[]): AgenciaCatalogo[] {
  return agencias.filter((a) => a.activa && a.servicios.length > 0);
}

export function serviciosDe(agencias: AgenciaCatalogo[], agenciaId: string | undefined): ServicioCatalogo[] {
  return agencias.find((a) => a.id === agenciaId)?.servicios ?? [];
}

/** Al cambiar de agencia conserva el servicio si la nueva lo ofrece; si no, toma el primero. */
export function servicioParaAgencia(agencias: AgenciaCatalogo[], agenciaId: string, servicioId: string | undefined): string | undefined {
  const servicios = serviciosDe(agencias, agenciaId);
  return servicios.find((s) => s.id === servicioId)?.id ?? servicios[0]?.id;
}

/** "Caja · Agencia Mocoa", para mostrar dónde está un turno. */
export function describirFila(agencias: AgenciaCatalogo[], agenciaId: string, servicioId: string): string | undefined {
  const agencia = agencias.find((a) => a.id === agenciaId);
  const servicio = agencia?.servicios.find((s) => s.id === servicioId);
  return agencia && servicio ? `${servicio.nombre} · ${agencia.nombre}` : undefined;
}
