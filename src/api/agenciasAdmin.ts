import { pedir } from './http';

export interface ServicioAgencia {
  servicioId: string;
  codigo: string;
  nombre: string;
  prefijo: string;
  ventanillas: number;
  activo: boolean;
}

export interface VistaParametro {
  clave: string;
  nombre: string;
  descripcion: string;
  tipo: 'entero' | 'hora';
  min?: number;
  max?: number;
  unidad?: string;
  valor: string;
  origen: 'AGENCIA' | 'GLOBAL' | 'POR_DEFECTO';
  editableEnAgencia: boolean;
}

export interface VistaAgencia {
  id: string;
  codigo: string;
  nombre: string;
  municipio: string;
  activa: boolean;
  servicios: ServicioAgencia[];
  parametros: VistaParametro[];
}

/** RF-17: los mismos endpoints que la web; el backend aplica el ámbito y audita cada cambio. */
export const agenciasAdminApi = {
  obtener: (id: string) => pedir<VistaAgencia>('GET', `/admin/agencias/${id}`),
  actualizarAgencia: (id: string, activa: boolean) => pedir<VistaAgencia>('PATCH', `/admin/agencias/${id}`, { cuerpo: { activa } }),
  actualizarServicio: (id: string, servicioId: string, cambios: { ventanillas?: number; activo?: boolean }) =>
    pedir<VistaAgencia>('PATCH', `/admin/agencias/${id}/servicios/${servicioId}`, { cuerpo: cambios }),
  fijarParametro: (id: string, clave: string, valor: string) =>
    pedir<VistaAgencia>('PUT', `/admin/agencias/${id}/parametros/${clave}`, { cuerpo: { valor } }),
  restablecerParametro: (id: string, clave: string) => pedir<VistaAgencia>('DELETE', `/admin/agencias/${id}/parametros/${clave}`),
  parametrosGlobales: () => pedir<VistaParametro[]>('GET', '/admin/parametros'),
  fijarParametroGlobal: (clave: string, valor: string) => pedir<VistaParametro[]>('PUT', `/admin/parametros/${clave}`, { cuerpo: { valor } }),
};

export const TEXTO_ORIGEN: Record<VistaParametro['origen'], string> = {
  AGENCIA: 'Propio de la agencia',
  GLOBAL: 'Valor global',
  POR_DEFECTO: 'Valor por defecto',
};

/** Valida en el navegador lo mismo que el backend, para avisar antes de enviar. */
export function errorDeValor(p: Pick<VistaParametro, 'tipo' | 'min' | 'max' | 'nombre'>, valor: string): string | null {
  if (p.tipo === 'hora') {
    return /^([01]\d|2[0-3]):(00|30)$/.test(valor) ? null : 'Usa una hora en punto o y media, por ejemplo 08:00 o 13:30';
  }
  const n = Number(valor);
  return Number.isInteger(n) && n >= (p.min ?? -Infinity) && n <= (p.max ?? Infinity) ? null : `Debe ser un número entero entre ${p.min} y ${p.max}`;
}
