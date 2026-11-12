import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tokensSeguros } from './almacenamiento/tokens';
import { fijarToken } from './api/http';

export type Rol = 'SUPERADMIN' | 'ADMIN_AGENCIA' | 'FUNCIONARIO' | 'ASOCIADO';

export interface AsignacionRol {
  rol: Rol;
  agenciaId?: string;
  servicioId?: string;
}

export interface Usuario {
  id: string;
  roles: AsignacionRol[];
  token: string;
}

interface Sesion {
  usuario: Usuario | null;
  cargando: boolean;
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

function leerToken(token: string): Usuario {
  const cuerpo = token.split('.')[1];
  if (!cuerpo) throw new Error('El token no tiene el formato esperado');
  const datos = JSON.parse(decodificarBase64Url(cuerpo)) as { sub?: string; roles?: AsignacionRol[] };
  if (!datos.sub || !Array.isArray(datos.roles)) throw new Error('El token no trae usuario ni roles');
  return { id: datos.sub, roles: datos.roles, token };
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    tokensSeguros
      .leer()
      .then((guardado) => {
        if (!guardado) return;
        const recuperado = leerToken(guardado);
        fijarToken(recuperado.token);
        setUsuario(recuperado);
      })
      .catch(() => tokensSeguros.borrar())
      .finally(() => setCargando(false));
  }, []);

  const iniciarConToken = useCallback(async (token: string) => {
    const nuevo = leerToken(token.trim());
    await tokensSeguros.guardar(nuevo.token);
    fijarToken(nuevo.token);
    setUsuario(nuevo);
  }, []);

  const cerrarSesion = useCallback(async () => {
    await tokensSeguros.borrar();
    fijarToken(null);
    setUsuario(null);
  }, []);

  const valor = useMemo(() => ({ usuario, cargando, iniciarConToken, cerrarSesion }), [usuario, cargando, iniciarConToken, cerrarSesion]);
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): Sesion {
  const sesion = useContext(ContextoSesion);
  if (!sesion) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return sesion;
}
