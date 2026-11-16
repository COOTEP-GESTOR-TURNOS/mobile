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
