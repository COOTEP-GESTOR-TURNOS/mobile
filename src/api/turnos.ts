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

/** Catálogo de los datos de prueba. Pendiente: GET /api/v1/agencias. */
export const AGENCIAS = [
  { id: 'a0000000-0000-4000-8000-000000000001', nombre: 'Mocoa' },
  { id: 'a0000000-0000-4000-8000-000000000002', nombre: 'Puerto Asís' },
  { id: 'a0000000-0000-4000-8000-000000000003', nombre: 'Orito' },
  { id: 'a0000000-0000-4000-8000-000000000004', nombre: 'La Hormiga' },
  { id: 'a0000000-0000-4000-8000-000000000005', nombre: 'Sibundoy' },
  { id: 'a0000000-0000-4000-8000-000000000006', nombre: 'Villagarzón' },
  { id: 'a0000000-0000-4000-8000-000000000007', nombre: 'Puerto Leguízamo' },
  { id: 'a0000000-0000-4000-8000-000000000008', nombre: 'Puerto Caicedo' },
];

export const SERVICIOS = [
  { id: 'b0000000-0000-4000-8000-000000000001', nombre: 'Caja' },
  { id: 'b0000000-0000-4000-8000-000000000002', nombre: 'Créditos' },
  { id: 'b0000000-0000-4000-8000-000000000003', nombre: 'Ahorros' },
  { id: 'b0000000-0000-4000-8000-000000000004', nombre: 'Atención' },
];
