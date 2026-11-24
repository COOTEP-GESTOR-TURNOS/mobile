import { StyleSheet, Text, View } from 'react-native';
import type { EstadoTurno, Turno } from '../api/turnos';
import { colores, espacio, radio, texto } from '../tema/tokens';

const ESTADOS: Record<EstadoTurno, { texto: string; color: string }> = {
  SOLICITADO: { texto: 'Solicitado', color: colores.info },
  EN_ESPERA: { texto: 'En espera', color: colores.info },
  PROXIMO: { texto: 'Ya casi: confirma que vienes', color: colores.aviso },
  LLAMADO: { texto: 'Te llamaron', color: colores.primario },
  EN_ATENCION: { texto: 'En atención', color: colores.primario },
  ATENDIDO: { texto: 'Atendido', color: colores.exito },
  CANCELADO: { texto: 'Cancelado', color: colores.error },
  AUSENTE: { texto: 'No se presentó', color: colores.error },
};

/** Próximo y ya confirmado: deja de pedir la confirmación y lo dice en verde, como el mensaje de arriba. */
const PROXIMO_CONFIRMADO = { texto: 'Ya casi: confirmaste que vas', color: colores.exito };

/** Estados en los que la posición en la fila ya no importa. */
const TEXTO_POR_ESTADO: Partial<Record<EstadoTurno, string>> = {
  LLAMADO: 'Acércate a la ventanilla',
  EN_ATENCION: 'Te están atendiendo',
  ATENDIDO: 'Este turno ya terminó',
  CANCELADO: 'Este turno ya terminó',
  AUSENTE: 'Este turno ya terminó',
};

function textoEspera(minutos: number | null | undefined): string {
  return typeof minutos === 'number' ? ` · unos ${Math.max(1, Math.ceil(minutos))} min` : '';
}

function textoPersonas(turno: Turno): string {
  if (turno.personasDelante === null) return 'Calculando tu posición…';
  if (turno.personasDelante === 0) return 'Eres el siguiente';
  return `${turno.personasDelante} ${turno.personasDelante === 1 ? 'persona' : 'personas'} delante${textoEspera(turno.esperaEstimadaMin)}`;
}

function textoPosicion(turno: Turno): string {
  return TEXTO_POR_ESTADO[turno.estado] ?? textoPersonas(turno);
}

function estadoVisible(turno: Turno, confirmado: boolean) {
  return turno.estado === 'PROXIMO' && confirmado ? PROXIMO_CONFIRMADO : ESTADOS[turno.estado];
}

/**
 * `lugar`: agencia y servicio según el catálogo, por ejemplo «Caja · Agencia Mocoa».
 * `confirmado`: el asociado ya confirmó que va (cambia la etiqueta del estado Próximo).
 */
export function TarjetaTurno({
  turno,
  titulo = 'Tu turno',
  desactualizado,
  lugar,
  confirmado = false,
}: {
  turno: Turno;
  titulo?: string;
  desactualizado?: string;
  lugar?: string;
  confirmado?: boolean;
}) {
  const estado = estadoVisible(turno, confirmado);
  return (
    <View style={estilos.tarjeta} accessible accessibilityLabel={`${titulo} ${turno.codigo ?? ''}, ${estado.texto}`}>
      <PlacaTurno titulo={titulo} codigo={turno.codigo} lugar={lugar} />
      <View style={estilos.cuerpo}>
        <View style={estilos.fila}>
          <Text style={[estilos.chip, { backgroundColor: estado.color }]}>● {estado.texto}</Text>
          {turno.tipoAtencion === 'PREFERENCIAL' && (
            <Text style={[estilos.chip, { backgroundColor: colores.preferencial }]}>Preferencial</Text>
          )}
        </View>
        {/* El lector de pantalla anuncia los cambios de posición */}
        <Text style={estilos.posicion} accessibilityLiveRegion="polite">
          {textoPosicion(turno)}
        </Text>
        {desactualizado && <Text style={estilos.aviso}>Sin conexión: último estado conocido de las {desactualizado}</Text>}
      </View>
    </View>
  );
}

/** El número del turno se ve como el logo: placa verde con letras doradas (5,4:1). */
function PlacaTurno({ titulo, codigo, lugar }: { titulo: string; codigo: Turno['codigo']; lugar?: string }) {
  return (
    <View style={estilos.placa}>
      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={estilos.codigo}>{codigo ?? '—'}</Text>
      {lugar && <Text style={estilos.lugar}>{lugar}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.superficie,
    borderColor: colores.dorado,
    borderWidth: 1,
    borderRadius: radio,
    overflow: 'hidden',
    marginBottom: espacio[4],
  },
  placa: {
    backgroundColor: colores.primario,
    alignItems: 'center',
    padding: espacio[5],
    borderBottomWidth: 4,
    borderBottomColor: colores.dorado,
  },
  titulo: { color: 'rgba(255,255,255,0.85)', fontSize: texto.sm, fontWeight: '600' },
  codigo: { color: colores.doradoClaro, fontSize: 44, fontWeight: '700', fontVariant: ['tabular-nums'], marginVertical: espacio[1] },
  lugar: { color: 'rgba(255,255,255,0.85)', fontSize: texto.md },
  cuerpo: { alignItems: 'center', padding: espacio[4] },
  fila: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: espacio[2] },
  chip: {
    color: '#FFFFFF',
    fontSize: texto.sm,
    fontWeight: '600',
    paddingHorizontal: espacio[3],
    paddingVertical: espacio[1],
    borderRadius: 999,
    overflow: 'hidden',
  },
  posicion: { color: colores.texto, fontSize: texto.md, fontWeight: '600', textAlign: 'center', marginTop: espacio[3] },
  aviso: { color: colores.aviso, fontSize: texto.sm, textAlign: 'center', marginTop: espacio[2] },
});
