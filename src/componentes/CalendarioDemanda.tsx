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

/** El día del detalle: el elegido si es de este mes; si no, hoy (o el 1 del mes). */
function diaVisible(datos: DatosCalendario | null, mes: string, hoy: string, fechaElegida: string): DiaDemanda | undefined {
  const fechaInicial = hoy.startsWith(mes) ? hoy : `${mes}-01`;
  const fecha = fechaElegida.startsWith(mes) ? fechaElegida : fechaInicial;
  return datos?.dias.find((item) => item.fecha === fecha);
}

export function CalendarioDemanda({ hoy, mes, datos, cambiarMes, alcance }: Props) {
  const [fechaElegida, setFechaElegida] = useState('');
  const dia = diaVisible(datos, mes, hoy, fechaElegida);

  function irAMes(nuevoMes: string) {
    setFechaElegida('');
    cambiarMes(nuevoMes);
  }

  return (
    <View style={estilos.contenedor}>
      <Text accessibilityRole="header" style={estilos.titulo}>Demanda de turnos</Text>
      {alcance ? <Text style={estilos.nota}>{alcance}</Text> : null}
      <NavegacionMes mes={mes} hoy={hoy} irAMes={irAMes} />
      <AvisosCalendario estado={datos?.estadoPronostico} />
      {datos && (
        <Mes dias={datos.dias} mes={mes} hoy={hoy} fechaElegida={dia?.fecha} elegir={setFechaElegida} />
      )}
      {dia && <DetalleDia dia={dia} hoy={hoy} />}
    </View>
  );
}

function NavegacionMes({ mes, hoy, irAMes }: { mes: string; hoy: string; irAMes: (mes: string) => void }) {
  return (
    <View style={estilos.navegacion}>
      <MesBoton icono="chevron-back" etiqueta="Mes anterior" onPress={() => irAMes(mesDesplazado(mes, -1))} />
      <Text style={estilos.mes} accessibilityLiveRegion="polite">{nombreMes(mes)}</Text>
      <MesBoton icono="today-outline" etiqueta="Ir al día de hoy" onPress={() => irAMes(hoy.slice(0, 7))} />
      <MesBoton icono="chevron-forward" etiqueta="Mes siguiente" onPress={() => irAMes(mesDesplazado(mes, 1))} />
    </View>
  );
}

function AvisosCalendario({ estado }: { estado?: DatosCalendario['estadoPronostico'] }) {
  return (
    <>
      {estado === 'HISTORIAL_INSUFICIENTE' && <Aviso tipo="info">Historial insuficiente para estimar la demanda.</Aviso>}
      {estado === 'INCOMPLETO' && <Aviso tipo="info">Pronóstico incompleto. Faltan estimaciones de agencias hábiles.</Aviso>}
    </>
  );
}

function DetalleDia({ dia, hoy }: { dia: DiaDemanda; hoy: string }) {
  return (
    <View style={estilos.detalle} accessibilityLiveRegion="polite">
      <Text accessibilityRole="header" style={estilos.textoDetalle}>{nombreFecha(dia.fecha)}</Text>
      <Text style={estilos.nota}>{resumenDia(dia, hoy)}</Text>
      {[...new Set(marcasDia(dia))].map((marca) => <Text key={marca} style={estilos.marca}>{marca}</Text>)}
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

/** El punto del día: festivo, vencimiento de crédito o evento de la agencia. */
function tieneMarca(dia: DiaDemanda): boolean {
  return Boolean(dia.festivoNacional) || dia.festivosPutumayo.length > 0 || dia.vencimientoCredito || dia.eventos.length > 0;
}

function DiaCalendario({ dia, hoy, seleccionado, seleccionar }: { dia: DiaDemanda; hoy: string; seleccionado: boolean; seleccionar: () => void }) {
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
        {tieneMarca(dia) && <View style={estilos.punto} />}
      </View>
      <Cifra valor={dia.turnosRegistrados} tipo="Reg." />
      {noHabil ? <Text style={estilos.cifraTipo}>No hábil</Text> : <EstimacionDia dia={dia} />}
    </Pressable>
  );
}

function Cifra({ valor, tipo }: { valor: number | null; tipo: string }) {
  if (valor === null) return null;
  return (
    <><Text style={estilos.cifra}>{valor}</Text><Text style={estilos.cifraTipo}>{tipo}</Text></>
  );
}

/** Solo los días hábiles tienen estimación y nivel de demanda. */
function EstimacionDia({ dia }: { dia: DiaDemanda }) {
  return (
    <>
      <Cifra valor={dia.turnosEstimados} tipo="Est." />
      {dia.nivelDemanda && <Text style={[estilos.cifraTipo, { color: NIVEL[dia.nivelDemanda] }]}>{nombreNivel(dia.nivelDemanda)}</Text>}
    </>
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
