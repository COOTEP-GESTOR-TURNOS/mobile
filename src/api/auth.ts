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
};
