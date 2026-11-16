import type { AsignacionRol, Rol } from '../sesion';
import { pedir } from './http';

export interface AsignacionGuardada extends AsignacionRol {
  id: string;
}

export interface FichaUsuario {
  id: string;
  email: string;
  nombre: string;
  activo: boolean;
  mfaActivo: boolean;
  tienePassword: boolean;
  roles: AsignacionGuardada[];
}

export const NOMBRE_ROL: Record<Rol, string> = {
  SUPERADMIN: 'Superadministrador',
  ADMIN_AGENCIA: 'Administrador de agencia',
  FUNCIONARIO: 'Funcionario',
  ASOCIADO: 'Asociado',
};

/** Los mismos endpoints que usa el panel web de administración (RF-18). El catálogo está en catalogo.ts. */
export const administracionApi = {
  listar: (texto: string) =>
    pedir<{ elementos: FichaUsuario[]; total: number }>('GET', `/admin/usuarios?tamano=30${texto ? `&texto=${encodeURIComponent(texto)}` : ''}`),
  crear: (datos: { email: string; nombre: string } & AsignacionRol) =>
    pedir<{ usuario: FichaUsuario; activacionEnviada: boolean }>('POST', '/admin/usuarios', { cuerpo: datos }),
  activar: (id: string, activo: boolean) => pedir<FichaUsuario>('PATCH', `/admin/usuarios/${id}`, { cuerpo: { activo } }),
  asignarRol: (id: string, asignacion: AsignacionRol) =>
    pedir<FichaUsuario>('POST', `/admin/usuarios/${id}/roles`, { cuerpo: asignacion }),
  revocarRol: (id: string, asignacionId: string) => pedir<FichaUsuario>('DELETE', `/admin/usuarios/${id}/roles/${asignacionId}`),
};

export function puedeAsignarRol(actor: AsignacionRol[], a: AsignacionRol): boolean {
  if (actor.some((r) => r.rol === 'SUPERADMIN')) return true;
  return a.rol === 'FUNCIONARIO' && actor.some((r) => r.rol === 'ADMIN_AGENCIA' && r.agenciaId === a.agenciaId);
}
