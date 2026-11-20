import { API_URL } from '../config';

let tokenAcceso: string | null = null;
/** La sesión registra aquí cómo renovar el token de acceso cuando la API responde 401. */
let renovador: (() => Promise<string | null>) | null = null;

export function fijarToken(token: string | null): void {
  tokenAcceso = token;
}

export function fijarRenovador(funcion: (() => Promise<string | null>) | null): void {
  renovador = funcion;
}

export interface Problema {
  title: string;
  status: number;
  detail?: string;
  codigo?: string;
}

/** Error con el formato Problem Details (RFC 9457) de los backends. */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly problema: Problema,
  ) {
    super(problema.detail ?? problema.title);
  }

  get codigo(): string | undefined {
    return this.problema.codigo;
  }
}

/**
 * El servidor no respondió (sin red, IP equivocada o conexión bloqueada). Expo SDK 58 reemplaza
 * fetch por expo/fetch, que falla con FetchError y no con TypeError, así que el fallo se marca aquí.
 */
export class ErrorConexion extends Error {
  constructor(causa: unknown) {
    super('No se pudo conectar con el servidor', { cause: causa });
  }
}

export function mensajeDeError(error: unknown, porDefecto = 'No se pudo completar la acción'): string {
  if (error instanceof ErrorApi) return error.problema.detail ?? error.message;
  if (error instanceof ErrorConexion || error instanceof TypeError) return 'No se pudo conectar con el servidor. Revisa la red Wi-Fi.';
  return porDefecto;
}

interface Opciones {
  cuerpo?: unknown;
  cabeceras?: Record<string, string>;
  renovarSi401?: boolean;
}

function enviar(metodo: string, ruta: string, opciones: Opciones): Promise<Response> {
  return fetch(`${API_URL}/api/v1${ruta}`, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      // El backend entrega los tokens en el cuerpo (no en cookies) cuando el cliente es la app.
      'X-Cliente': 'movil',
      ...(tokenAcceso ? { Authorization: `Bearer ${tokenAcceso}` } : {}),
      ...opciones.cabeceras,
    },
    body: opciones.cuerpo === undefined ? undefined : JSON.stringify(opciones.cuerpo),
  }).catch((causa: unknown) => {
    throw new ErrorConexion(causa);
  });
}

export async function pedir<T>(metodo: string, ruta: string, opciones: Opciones = {}): Promise<T | null> {
  let respuesta = await enviar(metodo, ruta, opciones);
  if (respuesta.status === 401 && opciones.renovarSi401 !== false && tokenAcceso && renovador) {
    const nuevo = await renovador().catch(() => null);
    if (nuevo) respuesta = await enviar(metodo, ruta, opciones);
  }
  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, (datos as Problema) ?? { title: 'Error', status: respuesta.status });
  }
  return datos as T;
}
