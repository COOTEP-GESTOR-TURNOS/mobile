import { pedir } from './http';

export type EstadoTurno =
  | 'SOLICITADO'
  | 'EN_ESPERA'
  | 'PROXIMO'
  | 'LLAMADO'
  | 'EN_ATENCION'
  | 'ATENDIDO'
  | 'CANCELADO'
  | 'AUSENTE';

export interface Turno {
  id: string;
  codigo: string | null;
  estado: EstadoTurno;
  tipoAtencion: 'GENERAL' | 'PREFERENCIAL';
  agenciaId: string;
  servicioId: string;
  personasDelante: number | null;
  esperaEstimadaMin?: number | null;
  /** Por qué terminó: SIN_CONFIRMAR, NO_SE_PRESENTO, CANCELADO_POR_ASOCIADO, ... */
  motivo?: string | null;
}

/** Mismos endpoints que la web: la app ofrece las mismas funciones, adaptadas al teléfono. */
export const turnosApi = {
  solicitar: (agenciaId: string, servicioId: string, solicitaPreferencial: boolean, idempotencyKey: string) =>
    pedir<Turno>('POST', '/turnos', {
      cuerpo: { agenciaId, servicioId, solicitaPreferencial, canal: 'MOVIL' },
      cabeceras: { 'Idempotency-Key': idempotencyKey },
    }),
  miTurno: () => pedir<Turno>('GET', '/turnos/mio'),
  confirmar: (id: string) => pedir<Turno>('POST', `/turnos/${id}/confirmar`),
  cancelar: (id: string) => pedir<Turno>('POST', `/turnos/${id}/cancelar`),
  llamarSiguiente: (agenciaId: string, servicioId: string) =>
    pedir<Turno>('POST', `/filas/${agenciaId}/${servicioId}/siguiente`),
  atender: (id: string, accion: 'iniciar' | 'finalizar' | 'ausente') => pedir<Turno>('POST', `/turnos/${id}/${accion}`),
  verificarPreferencial: (id: string, cumple: boolean) =>
    pedir<Turno>('POST', `/turnos/${id}/verificar-preferencial`, { cuerpo: { cumple } }),
};

/** Mensaje después de confirmar la asistencia, con las personas que faltan antes del turno (igual que la web). */
export function mensajeConfirmado(t: Pick<Turno, 'personasDelante'>): string {
  const base = 'Confirmaste que vas.';
  if (t.personasDelante === null) return `${base} Te avisamos aquí cuando te llamen.`;
  if (t.personasDelante === 0) return `${base} Eres el siguiente: acércate a la agencia.`;
  if (t.personasDelante === 1) return `${base} Falta 1 persona antes de tu turno.`;
  return `${base} Faltan ${t.personasDelante} personas antes de tu turno.`;
}

/**
 * RN-01: al pedir un turno con otro aún activo (por ejemplo, uno confirmado que nadie ha llamado),
 * la pantalla muestra ese turno y explica qué hacer para pedir otro.
 */
export function mensajeTurnoActivo(t: Pick<Turno, 'codigo' | 'estado'>, lugar?: string): string {
  const turno = `Ya tienes el turno ${t.codigo ?? 'que pediste'}${lugar ? ` (${lugar})` : ''} activo.`;
  const cancelable = ['SOLICITADO', 'EN_ESPERA', 'PROXIMO'].includes(t.estado);
  return `${turno} ${cancelable ? 'Cancélalo si quieres pedir otro.' : 'Termina ese turno antes de pedir otro.'}`;
}

/**
 * Aviso para el asociado cuando su turno cambia por algo que él no hizo (RN-10, RN-11): la
 * pantalla vuelve al formulario y sin este texto no sabría por qué.
 */
export function avisoDeCambio(t: Pick<Turno, 'estado' | 'codigo' | 'motivo'>): string | null {
  const codigo = t.codigo ? `Tu turno ${t.codigo}` : 'Tu turno';
  if (t.estado === 'PROXIMO') return `${codigo} está cerca. Confirma que vas para no perderlo.`;
  if (t.estado === 'LLAMADO') return `${codigo} fue llamado. Acércate a la ventanilla.`;
  if (t.estado === 'AUSENTE' && t.motivo === 'SIN_CONFIRMAR') return `${codigo} quedó ausente porque no confirmaste a tiempo. Puedes pedir uno nuevo.`;
  if (t.estado === 'AUSENTE') return `${codigo} quedó ausente porque no te presentaste a la ventanilla. Puedes pedir uno nuevo.`;
  if (t.estado === 'CANCELADO' && t.motivo === 'CIERRE_AGENCIA')
    return `${codigo} se canceló porque la agencia cerró la jornada. Puedes pedir uno en otra agencia o mañana.`;
  return null;
}
