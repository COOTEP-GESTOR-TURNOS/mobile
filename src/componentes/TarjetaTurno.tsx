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
      {/* El número del turno se ve como el logo: placa verde con letras doradas (5,4:1). */}
      <View style={estilos.placa}>
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilos.codigo}>{turno.codigo ?? '—'}</Text>
        {lugar && <Text style={estilos.lugar}>{lugar}</Text>}
      </View>
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
