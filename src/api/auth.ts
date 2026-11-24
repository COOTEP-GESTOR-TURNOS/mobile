import type { AsignacionRol } from '../sesion';
import { pedir } from './http';

export type TipoDocumento = 'CC' | 'CE' | 'TI' | 'PA';
export const TIPOS_DOCUMENTO: { id: TipoDocumento; nombre: string }[] = [
  { id: 'CC', nombre: 'C.C.' },
  { id: 'CE', nombre: 'C.E.' },
  { id: 'TI', nombre: 'T.I.' },
  { id: 'PA', nombre: 'Pasaporte' },
];

export interface Perfil {
  id: string;
  email: string;
  nombre: string;
  tipoDocumento: TipoDocumento | null;
  numeroDocumento: string | null;
  /** AAAA-MM-DD; sirve para la atención preferencial por edad (RN-05). */
  fechaNacimiento: string | null;
  roles: AsignacionRol[];
  mfaActivo: boolean;
  tienePassword: boolean;
  perfilCompleto: boolean;
}

export type Paso = 'CAMBIAR_CLAVE' | 'CONFIGURAR_MFA' | 'VERIFICAR_MFA';

export interface SesionAbierta {
  estado?: 'SESION_INICIADA';
  tokenAcceso: string;
  expiraEn: number;
  tokenRenovacion: string;
  usuario: Perfil;
}

export type ResultadoIngreso =
  | (SesionAbierta & { estado: 'SESION_INICIADA' })
  | { estado: 'PASO_PENDIENTE'; reto: string; paso: Paso; nombre: string };

const sinRenovar = { renovarSi401: false };

/** Los mismos endpoints de la web; con X-Cliente: movil la renovación llega en el cuerpo. */
export const authApi = {
  login: (correo: string, clave: string) =>
    pedir<ResultadoIngreso>('POST', '/auth/login', { cuerpo: { correo, clave }, ...sinRenovar }),
  claveInicial: (reto: string, claveNueva: string) =>
    pedir<ResultadoIngreso>('POST', '/auth/clave-inicial', { cuerpo: { reto, claveNueva }, ...sinRenovar }),
  configurarMfa: (reto: string) =>
    pedir<{ secreto: string; uri: string; qr: string }>('POST', '/auth/mfa/configurar', { cuerpo: { reto }, ...sinRenovar }),
  verificarMfa: (reto: string, codigo: string) =>
    pedir<ResultadoIngreso>('POST', '/auth/mfa/verificar', { cuerpo: { reto, codigo }, ...sinRenovar }),
  renovar: (tokenRenovacion: string) =>
    pedir<SesionAbierta>('POST', '/auth/renovar', { cuerpo: { tokenRenovacion }, ...sinRenovar }),
  cerrarSesion: (tokenRenovacion: string | null) =>
    pedir<void>('POST', '/auth/cerrar-sesion', { cuerpo: tokenRenovacion ? { tokenRenovacion } : {}, ...sinRenovar }),
  canjear: (codigo: string) => pedir<SesionAbierta>('POST', '/auth/oidc/canjear', { cuerpo: { codigo }, ...sinRenovar }),
  registro: (datos: { email: string; nombre: string; tipoDocumento: TipoDocumento; numeroDocumento: string; clave: string }) =>
    pedir<{ email: string; mensaje: string }>('POST', '/auth/registro', { cuerpo: datos, ...sinRenovar }),
  reenviarVerificacion: (correo: string) =>
    pedir<{ mensaje: string }>('POST', '/auth/verificar-correo/reenviar', { cuerpo: { correo }, ...sinRenovar }),
  recuperar: (correo: string) => pedir<{ mensaje: string }>('POST', '/auth/recuperar', { cuerpo: { correo }, ...sinRenovar }),
  yo: () => pedir<Perfil>('GET', '/auth/yo'),
  actualizarPerfil: (cambios: Partial<Pick<Perfil, 'nombre' | 'tipoDocumento' | 'numeroDocumento' | 'fechaNacimiento'>>) =>
    pedir<void>('PATCH', '/auth/yo', { cuerpo: cambios }),
  cambiarClave: (claveNueva: string, claveActual?: string) =>
    pedir<void>('POST', '/auth/yo/clave', { cuerpo: { claveNueva, ...(claveActual ? { claveActual } : {}) } }),
};

/** Mínimo de la política de contraseñas: 15 sin MFA, 8 con MFA (NIST SP 800-63B-4), igual que la web. */
export function minimoClave(roles: AsignacionRol[]): number {
  return roles.some((r) => r.rol === 'SUPERADMIN' || r.rol === 'ADMIN_AGENCIA') ? 8 : 15;
}

/**
 * El teléfono no trae selector de fecha: la fecha se escribe AAAA-MM-DD. Se revisa antes de enviar
 * que exista (no 2000-02-31) y que no sea futura; vacía es válida porque el dato es opcional.
 */
export function errorDeFecha(texto: string, hoy = new Date()): string | null {
  if (texto === '') return null;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return 'Escríbela así: 1985-04-23 (año-mes-día)';
  const [anio, mes, dia] = partes.slice(1).map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (!esLaMismaFecha(fecha, anio, mes, dia)) return 'Esa fecha no existe';
  if (fueraDeRango(fecha, anio, hoy)) return 'Revisa el año: la fecha no puede ser futura';
  return null;
}

/** Date corrige fechas imposibles (31 de febrero pasa a marzo): si cambió, la fecha no existe. */
function esLaMismaFecha(fecha: Date, anio: number, mes: number, dia: number): boolean {
  return fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
}

function fueraDeRango(fecha: Date, anio: number, hoy: Date): boolean {
  return anio < 1900 || fecha.getTime() > hoy.getTime();
}
