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

function textoPosicion(turno: Turno): string {
  if (turno.estado === 'LLAMADO') return 'Acércate a la ventanilla';
  if (turno.estado === 'EN_ATENCION') return 'Te están atendiendo';
  if (['ATENDIDO', 'CANCELADO', 'AUSENTE'].includes(turno.estado)) return 'Este turno ya terminó';
  if (turno.personasDelante === null) return 'Calculando tu posición…';
  if (turno.personasDelante === 0) return 'Eres el siguiente';
  const espera = typeof turno.esperaEstimadaMin === 'number' ? ` · unos ${Math.max(1, Math.ceil(turno.esperaEstimadaMin))} min` : '';
  return `${turno.personasDelante} ${turno.personasDelante === 1 ? 'persona' : 'personas'} delante${espera}`;
}

/** `lugar`: agencia y servicio según el catálogo, por ejemplo «Caja · Agencia Mocoa». */
export function TarjetaTurno({ turno, titulo = 'Tu turno', desactualizado, lugar }: { turno: Turno; titulo?: string; desactualizado?: string; lugar?: string }) {
  const estado = ESTADOS[turno.estado];
  return (
    <View style={estilos.tarjeta} accessible accessibilityLabel={`${titulo} ${turno.codigo ?? ''}, ${estado.texto}`}>
      <Text style={estilos.titulo}>{titulo}</Text>
      <Text style={estilos.codigo}>{turno.codigo ?? '—'}</Text>
      {lugar && <Text style={estilos.lugar}>{lugar}</Text>}
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
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.primarioSuave,
    borderColor: colores.borde,
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio[5],
    marginBottom: espacio[4],
  },
  titulo: { color: colores.textoSecundario, fontSize: texto.sm },
  lugar: { color: colores.textoSecundario, fontSize: texto.md, marginBottom: espacio[2] },
  codigo: { color: colores.texto, fontSize: texto.xxl, fontWeight: '600', marginVertical: espacio[2] },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[2] },
  chip: {
    color: '#FFFFFF',
    fontSize: texto.sm,
    fontWeight: '600',
    paddingHorizontal: espacio[3],
    paddingVertical: espacio[1],
    borderRadius: 999,
    overflow: 'hidden',
  },
  posicion: { color: colores.texto, fontSize: texto.md, marginTop: espacio[3] },
  aviso: { color: colores.aviso, fontSize: texto.sm, marginTop: espacio[2] },
});
