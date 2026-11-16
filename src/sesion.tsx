import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { tokensSeguros } from './almacenamiento/tokens';
import { authApi, type Perfil, type SesionAbierta } from './api/auth';
import { fijarRenovador, fijarToken } from './api/http';

export type Rol = 'SUPERADMIN' | 'ADMIN_AGENCIA' | 'FUNCIONARIO' | 'ASOCIADO';

export interface AsignacionRol {
  rol: Rol;
  agenciaId?: string;
  servicioId?: string;
}

export interface Usuario extends Perfil {
  token: string;
}

interface Sesion {
  usuario: Usuario | null;
  cargando: boolean;
  abrirSesion: (sesion: SesionAbierta) => Promise<void>;
  /** Solo desarrollo: token de npm run token:dev (sin renovación). */
  iniciarConToken: (token: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const ContextoSesion = createContext<Sesion | null>(null);
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Decodifica base64url sin depender de atob. El backend valida la firma en cada petición. */
function decodificarBase64Url(texto: string): string {
  let bits = 0;
  let acumulado = 0;
  let salida = '';
  for (const caracter of texto.replace(/=+$/, '')) {
    const valor = ALFABETO.indexOf(caracter);
    if (valor < 0) throw new Error('Token mal formado');
    acumulado = (acumulado << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      salida += String.fromCharCode((acumulado >> bits) & 0xff);
    }
  }
  return salida;
}

/** Una sola renovación a la vez: rota el token, y dos simultáneas harían fallar a la segunda. */
let renovacionEnCurso: Promise<SesionAbierta | null> | null = null;
function renovarUnaVez(): Promise<SesionAbierta | null> {
  renovacionEnCurso ??= (async () => {
    const guardado = await tokensSeguros.leer();
    if (!guardado) return null;
    const sesion = await authApi.renovar(guardado).catch(async () => {
      await tokensSeguros.borrar();
      return null;
    });
    if (sesion) await tokensSeguros.guardar(sesion.tokenRenovacion);
    return sesion;
  })().finally(() => {
    renovacionEnCurso = null;
  });
  return renovacionEnCurso;
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const limpiar = useCallback(() => {
    clearTimeout(temporizador.current);
    fijarToken(null);
    setUsuario(null);
  }, []);

  const aplicar = useCallback(
    (sesion: SesionAbierta) => {
      fijarToken(sesion.tokenAcceso);
      setUsuario({ ...sesion.usuario, token: sesion.tokenAcceso });
      clearTimeout(temporizador.current);
      // Renueva un minuto antes de que venza el token de acceso.
      temporizador.current = setTimeout(
        () => void renovarUnaVez().then((s) => (s ? aplicar(s) : limpiar())),
        Math.max(30, sesion.expiraEn - 60) * 1000,
      );
    },
    [limpiar],
  );

  useEffect(() => {
    fijarRenovador(async () => {
      const s = await renovarUnaVez();
      if (!s) {
        limpiar();
        return null;
      }
      aplicar(s);
      return s.tokenAcceso;
    });
    void renovarUnaVez()
      .then((s) => s && aplicar(s))
      .finally(() => setCargando(false));
    return () => {
      fijarRenovador(null);
      clearTimeout(temporizador.current);
    };
  }, [aplicar, limpiar]);

  const abrirSesion = useCallback(
    async (sesion: SesionAbierta) => {
      await tokensSeguros.guardar(sesion.tokenRenovacion);
      aplicar(sesion);
    },
    [aplicar],
  );

  const iniciarConToken = useCallback(async (token: string) => {
    const cuerpo = token.trim().split('.')[1];
    if (!cuerpo) throw new Error('El token no tiene el formato esperado');
    const datos = JSON.parse(decodificarBase64Url(cuerpo)) as { sub?: string; roles?: AsignacionRol[] };
    if (!datos.sub || !Array.isArray(datos.roles)) throw new Error('El token no trae usuario ni roles');
    fijarToken(token.trim());
    setUsuario({
      id: datos.sub,
      roles: datos.roles,
      token: token.trim(),
      email: '',
      nombre: 'Usuario de prueba',
      mfaActivo: false,
      tienePassword: false,
      perfilCompleto: true,
    });
  }, []);

  const cerrarSesion = useCallback(async () => {
    const guardado = await tokensSeguros.leer();
    await authApi.cerrarSesion(guardado).catch(() => undefined);
    await tokensSeguros.borrar();
    limpiar();
  }, [limpiar]);

  const valor = useMemo(
    () => ({ usuario, cargando, abrirSesion, iniciarConToken, cerrarSesion }),
    [usuario, cargando, abrirSesion, iniciarConToken, cerrarSesion],
  );
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(ContextoSesion);
  if (!sesion) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return sesion;
}
