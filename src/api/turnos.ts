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
  /** RN-10: ya confirmó que va. Lo dice el servidor, así que vale en todos sus dispositivos. */
  confirmado: boolean;
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
type CambioTurno = Pick<Turno, 'estado' | 'codigo' | 'motivo'> & Partial<Pick<Turno, 'confirmado'>>;

/** Reglas en orden: gana la primera que aplica. `texto` recibe «Tu turno C-014» (o «Tu turno»). */
const AVISOS: { aplica: (t: CambioTurno) => boolean; texto: (codigo: string) => string | null }[] = [
  // Ya confirmó: no se le pide otra vez.
  { aplica: (t) => t.estado === 'PROXIMO' && Boolean(t.confirmado), texto: () => null },
  { aplica: (t) => t.estado === 'PROXIMO', texto: (c) => `${c} está cerca. Confirma que vas para no perderlo.` },
  { aplica: (t) => t.estado === 'LLAMADO', texto: (c) => `${c} fue llamado. Acércate a la ventanilla.` },
  {
    aplica: (t) => t.estado === 'AUSENTE' && t.motivo === 'SIN_CONFIRMAR',
    texto: (c) => `${c} quedó ausente porque no confirmaste a tiempo. Puedes pedir uno nuevo.`,
  },
  { aplica: (t) => t.estado === 'AUSENTE', texto: (c) => `${c} quedó ausente porque no te presentaste a la ventanilla. Puedes pedir uno nuevo.` },
  {
    aplica: (t) => t.estado === 'CANCELADO' && t.motivo === 'CIERRE_AGENCIA',
    texto: (c) => `${c} se canceló porque la agencia cerró la jornada. Puedes pedir uno en otra agencia o mañana.`,
  },
];

export function avisoDeCambio(t: CambioTurno): string | null {
  const regla = AVISOS.find((r) => r.aplica(t));
  return regla ? regla.texto(t.codigo ? `Tu turno ${t.codigo}` : 'Tu turno') : null;
}
