import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  type CalendarioDemanda as DatosCalendario,
  type DiaDemanda,
  type NivelDemanda,
  huecosDelMes,
  marcasDia,
  mesDesplazado,
  nombreFecha,
  nombreMes,
  nombreNivel,
  resumenDia,
} from '../api/demanda';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';
import { Aviso } from './Campo';

const SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const NIVEL: Record<NivelDemanda, string> = { BAJA: colores.exito, MEDIA: colores.aviso, ALTA: colores.error };

interface Props {
  hoy: string;
  mes: string;
  datos: DatosCalendario | null;
  cambiarMes: (mes: string) => void;
  alcance?: string;
}

export function CalendarioDemanda({ hoy, mes, datos, cambiarMes, alcance }: Props) {
  const [fechaElegida, setFechaElegida] = useState('');
  const fechaInicial = hoy.startsWith(mes) ? hoy : `${mes}-01`;
  const dia = datos?.dias.find((item) => item.fecha === (fechaElegida.startsWith(mes) ? fechaElegida : fechaInicial));

  function irAMes(nuevoMes: string) {
    setFechaElegida('');
    cambiarMes(nuevoMes);
  }

  return (
    <View style={estilos.contenedor}>
      <Text accessibilityRole="header" style={estilos.titulo}>Demanda de turnos</Text>
      {alcance ? <Text style={estilos.nota}>{alcance}</Text> : null}
      <View style={estilos.navegacion}>
        <MesBoton icono="chevron-back" etiqueta="Mes anterior" onPress={() => irAMes(mesDesplazado(mes, -1))} />
        <Text style={estilos.mes} accessibilityLiveRegion="polite">{nombreMes(mes)}</Text>
        <MesBoton icono="today-outline" etiqueta="Ir al día de hoy" onPress={() => irAMes(hoy.slice(0, 7))} />
        <MesBoton icono="chevron-forward" etiqueta="Mes siguiente" onPress={() => irAMes(mesDesplazado(mes, 1))} />
      </View>
      {datos?.estadoPronostico === 'HISTORIAL_INSUFICIENTE' && <Aviso tipo="info">Historial insuficiente para estimar la demanda.</Aviso>}
      {datos?.estadoPronostico === 'INCOMPLETO' && <Aviso tipo="info">Pronóstico incompleto. Faltan estimaciones de agencias hábiles.</Aviso>}
      {datos && (
        <Mes dias={datos.dias} mes={mes} hoy={hoy} fechaElegida={dia?.fecha} elegir={setFechaElegida} />
      )}
      {dia && (
        <View style={estilos.detalle} accessibilityLiveRegion="polite">
          <Text accessibilityRole="header" style={estilos.textoDetalle}>{nombreFecha(dia.fecha)}</Text>
          <Text style={estilos.nota}>{resumenDia(dia, hoy)}</Text>
          {[...new Set(marcasDia(dia))].map((marca) => <Text key={marca} style={estilos.marca}>{marca}</Text>)}
        </View>
      )}
    </View>
  );
}

function MesBoton({ icono, etiqueta, onPress }: { icono: 'chevron-back' | 'today-outline' | 'chevron-forward'; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={etiqueta} onPress={onPress} style={({ pressed }) => [estilos.mesBoton, pressed && estilos.pulsado]}>
      <Ionicons name={icono} size={20} color={colores.primario} />
    </Pressable>
  );
}

function Mes({ dias, mes, hoy, fechaElegida, elegir }: { dias: DiaDemanda[]; mes: string; hoy: string; fechaElegida?: string; elegir: (fecha: string) => void }) {
  const celdas: (DiaDemanda | null)[] = [...Array<DiaDemanda | null>(huecosDelMes(mes)).fill(null), ...dias];
  const semanas = Array.from({ length: Math.ceil(celdas.length / 7) }, (_, i) =>
    SEMANA.map((_, j) => celdas[i * 7 + j] ?? null),
  );
  return (
    <View style={estilos.calendario}>
      <View style={estilos.semana}>
        {SEMANA.map((nombre) => <Text key={nombre} style={estilos.diaSemana}>{nombre}</Text>)}
      </View>
      {semanas.map((semana, i) => (
        <View key={i} style={estilos.semana}>
          {semana.map((dia, j) => dia
            ? <DiaCalendario key={dia.fecha} dia={dia} hoy={hoy} seleccionado={dia.fecha === fechaElegida} seleccionar={() => elegir(dia.fecha)} />
            : <View key={`hueco-${j}`} style={estilos.hueco} accessible={false} />)}
        </View>
      ))}
      <Text style={estilos.nota}>Reg. indica turnos registrados y Est. indica turnos estimados. Toca un día con punto para ver sus marcas y eventos.</Text>
    </View>
  );
}

function DiaCalendario({ dia, hoy, seleccionado, seleccionar }: { dia: DiaDemanda; hoy: string; seleccionado: boolean; seleccionar: () => void }) {
  const hayMarca = dia.festivoNacional || dia.festivosPutumayo.length > 0 || dia.vencimientoCredito || dia.eventos.length > 0;
  const noHabil = dia.diaHabil === false;
  const etiqueta = [nombreFecha(dia.fecha), resumenDia(dia, hoy), ...marcasDia(dia)].join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: seleccionado }}
      onPress={seleccionar}
      style={({ pressed }) => [estilos.dia, noHabil && estilos.noHabil, seleccionado && estilos.seleccion, pressed && estilos.pulsado]}
    >
      <View style={estilos.numeroDia}>
        <Text style={estilos.diaTexto}>{Number(dia.fecha.slice(-2))}</Text>
        {hayMarca && <View style={estilos.punto} />}
      </View>
      {dia.turnosRegistrados !== null && (
        <><Text style={estilos.cifra}>{dia.turnosRegistrados}</Text><Text style={estilos.cifraTipo}>Reg.</Text></>
      )}
      {noHabil && <Text style={estilos.cifraTipo}>No hábil</Text>}
      {!noHabil && dia.turnosEstimados !== null && (
        <><Text style={estilos.cifra}>{dia.turnosEstimados}</Text><Text style={estilos.cifraTipo}>Est.</Text></>
      )}
      {!noHabil && dia.nivelDemanda && <Text style={[estilos.cifraTipo, { color: NIVEL[dia.nivelDemanda] }]}>{nombreNivel(dia.nivelDemanda)}</Text>}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginTop: espacio[5] },
  titulo: { color: colores.texto, fontSize: texto.lg, fontWeight: '600' },
  navegacion: { flexDirection: 'row', alignItems: 'center', gap: espacio[1], marginVertical: espacio[3] },
  mes: { flex: 1, textAlign: 'center', textTransform: 'capitalize', fontWeight: '600', color: colores.texto, fontSize: texto.sm },
  mesBoton: {
    width: objetivoTactil, height: objetivoTactil, borderWidth: 1, borderColor: colores.borde,
    borderRadius: radio, backgroundColor: colores.superficie, justifyContent: 'center', alignItems: 'center',
  },
  calendario: { gap: espacio[1], marginTop: espacio[2] },
  semana: { flexDirection: 'row', gap: 2 },
  diaSemana: { flex: 1, paddingHorizontal: 2, borderWidth: 1, borderColor: 'transparent', textAlign: 'center', fontSize: texto.xs, color: colores.textoSecundario },
  hueco: { flex: 1, paddingHorizontal: 2, borderWidth: 1, borderColor: 'transparent' },
  dia: {
    flex: 1, minHeight: 67, paddingVertical: 3, paddingHorizontal: 2, alignItems: 'center', borderWidth: 1,
    borderRadius: radio, borderColor: colores.borde, backgroundColor: colores.superficie,
  },
  numeroDia: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  diaTexto: { fontSize: texto.xs, color: colores.texto },
  punto: { width: 4, height: 4, borderRadius: 2, backgroundColor: colores.info },
  noHabil: { backgroundColor: colores.fondo },
  seleccion: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
  pulsado: { opacity: 0.75 },
  cifra: { marginTop: 2, fontWeight: '600', fontSize: texto.xs, color: colores.texto },
  cifraTipo: { fontSize: texto.xs, fontWeight: '600', color: colores.textoSecundario },
  nota: { color: colores.textoSecundario, fontSize: texto.sm },
  detalle: { gap: espacio[1], borderRadius: radio, borderWidth: 1, borderColor: colores.borde, backgroundColor: colores.superficie, padding: espacio[3], marginTop: espacio[3] },
  textoDetalle: { fontWeight: '600', color: colores.texto },
  marca: { color: colores.texto, fontSize: texto.sm },
});
