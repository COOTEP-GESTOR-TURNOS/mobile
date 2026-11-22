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
  /** Vuelve a leer el perfil después de cambiar los datos propios (por ejemplo, el documento). */
  recargarPerfil: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const ContextoSesion = createContext<Sesion | null>(null);

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

  const recargarPerfil = useCallback(async () => {
    const perfil = await authApi.yo();
    if (perfil) setUsuario((actual) => (actual ? { ...actual, ...perfil } : actual));
  }, []);

  const cerrarSesion = useCallback(async () => {
    const guardado = await tokensSeguros.leer();
    await authApi.cerrarSesion(guardado).catch(() => undefined);
    await tokensSeguros.borrar();
    limpiar();
  }, [limpiar]);

  const valor = useMemo(
    () => ({ usuario, cargando, abrirSesion, recargarPerfil, cerrarSesion }),
    [usuario, cargando, abrirSesion, recargarPerfil, cerrarSesion],
  );
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(ContextoSesion);
  if (!sesion) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return sesion;
}
