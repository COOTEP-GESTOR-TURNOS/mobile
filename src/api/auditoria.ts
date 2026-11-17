import { pedir } from './http';

export interface EntradaAuditoria {
  ocurridoEn: string;
  ambito: string;
  accion: string;
  actor: { id: string; rol: string | null; nombre: string | null; email: string | null };
  objetivoTipo: string | null;
  objetivoId: string;
  detalle: Record<string, unknown> | null;
  ip: string | null;
}

export interface PaginaAuditoria {
  entradas: EntradaAuditoria[];
  siguiente: string | null;
}

/** RF-20: solo lectura. La API no tiene ninguna operación para editar o borrar la auditoría. */
export const auditoriaApi = {
  porAmbitoDia: (f: { ambito: string; dia: string; accion?: string; siguiente?: string }) => {
    const q = new URLSearchParams({ ambito: f.ambito, dia: f.dia, limite: '50' });
    if (f.accion) q.set('accion', f.accion);
    if (f.siguiente) q.set('siguiente', f.siguiente);
    return pedir<PaginaAuditoria & { ambito: string; dia: string }>('GET', `/admin/auditoria?${q.toString()}`);
  },
  porActorMes: (actorId: string, mes: string, siguiente?: string) => {
    const q = new URLSearchParams({ mes, limite: '50' });
    if (siguiente) q.set('siguiente', siguiente);
    return pedir<PaginaAuditoria & { actorId: string; mes: string }>('GET', `/admin/auditoria/actores/${actorId}?${q.toString()}`);
  },
};

export const NOMBRE_ACCION: Record<string, string> = {
  LOGIN_ADMIN: 'Ingreso administrativo',
  LOGIN_FALLIDO: 'Ingreso fallido',
  MFA_CONFIGURADO: 'MFA configurado',
  MFA_RESTABLECIDO: 'MFA restablecido',
  CLAVE_RESTABLECIDA: 'Contraseña restablecida',
  CUENTA_ACTIVADA: 'Cuenta activada',
  USUARIO_CREADO: 'Usuario creado',
  USUARIO_ACTUALIZADO: 'Usuario editado',
  USUARIO_ACTIVADO: 'Usuario activado',
  USUARIO_DESACTIVADO: 'Usuario desactivado',
  ROL_ASIGNADO: 'Rol asignado',
  ROL_REVOCADO: 'Rol retirado',
  INTENTO_FUERA_DE_AMBITO: 'Intento fuera de su ámbito',
  SERVICIO_ACTUALIZADO: 'Servicio o ventanillas',
  PARAMETRO_CAMBIADO: 'Parámetro cambiado',
  PARAMETRO_RESTABLECIDO: 'Parámetro restablecido',
  AGENCIA_ACTIVADA: 'Agencia abierta',
  AGENCIA_DESACTIVADA: 'Agencia cerrada',
  JORNADA_CERRADA: 'Jornada cerrada',
  JORNADA_REABIERTA: 'Jornada reabierta',
};

/** Acciones que conviene revisar: se marcan en la tabla. */
export const ACCIONES_ALERTA = new Set(['LOGIN_FALLIDO', 'INTENTO_FUERA_DE_AMBITO', 'MFA_RESTABLECIDO']);

/** Hora HH:MM:SS en Colombia (UTC−5 todo el año), sin depender del soporte de zonas de Intl. */
export function horaColombia(iso: string): string {
  return new Date(Date.parse(iso) - 5 * 3_600_000).toISOString().slice(11, 19);
}

/** "antes: 3 → después: 4", o las claves y valores en una línea. */
export function describirDetalle(detalle: Record<string, unknown> | null): string {
  if (!detalle || Object.keys(detalle).length === 0) return '';
  // Una asignación de rol se resume con el nombre del rol: la agencia ya es el ámbito del registro.
  const texto = (v: unknown) =>
    typeof v === 'object' && v !== null
      ? 'rol' in v && typeof (v as { rol: unknown }).rol === 'string'
        ? (v as { rol: string }).rol
        : JSON.stringify(v)
      : String(v);
  if ('antes' in detalle && 'despues' in detalle) return `${texto(detalle.antes)} → ${texto(detalle.despues)}`;
  // Cierre de la jornada (RN-13): lo que importa es cuántos turnos se cancelaron y cuánto tardó el motor.
  if ('cancelados' in detalle && 'siguenEnAtencion' in detalle) {
    const partes = [`${String(detalle.cancelados)} cancelados`, `${String(detalle.siguenEnAtencion)} en atención`, `motor ${String(detalle.duracionMotorMs)} ms`];
    return [...partes, ...(detalle.automatico ? ['automático'] : [])].join(' · ');
  }
  return Object.entries(detalle)
    .map(([k, v]) => `${k}: ${texto(v)}`)
    .join(' · ');
}
