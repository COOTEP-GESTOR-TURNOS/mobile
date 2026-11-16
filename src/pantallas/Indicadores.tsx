import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mensajeDeError } from '../api/http';
import { indicadoresApi, porcentaje, type TableroIndicadores, totalTurnos } from '../api/indicadores';
import { Aviso } from '../componentes/Campo';
import { Opciones } from '../componentes/Opciones';
import { colores, espacio, radio, texto } from '../tema/tokens';

const PERIODOS: { id: '7' | '30'; nombre: string }[] = [
  { id: '7', nombre: '7 días' },
  { id: '30', nombre: '30 días' },
];

/** RF-19 en el teléfono: el resumen del tablero web, con la lista de agencias para el superadministrador. */
export function Indicadores() {
  const [periodo, setPeriodo] = useState<'7' | '30'>('30');
  const [tablero, setTablero] = useState<TableroIndicadores | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    indicadoresApi
      .consultar(Number(periodo))
      .then((t) => vigente && setTablero(t))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'No se pudieron cargar los indicadores')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [periodo]);

  const total = tablero?.total;
  const turnos = total ? totalTurnos(total) : 0;
  const agencias = tablero ? [...tablero.agencias].sort((a, b) => b.esperaPromedioMin - a.esperaPromedioMin) : [];

  return (
    <View>
      <Text style={estilos.titulo}>{tablero?.ambito === 'GLOBAL' ? 'Indicadores de las agencias' : `Indicadores · ${tablero?.agencias[0]?.nombre ?? 'tu agencia'}`}</Text>
      <Opciones titulo="Periodo" opciones={PERIODOS} valor={periodo} onCambio={setPeriodo} />
      {cargando && <Text style={estilos.nota}>Cargando indicadores…</Text>}
      {error && <Aviso>{error}</Aviso>}
      {!cargando && total && (
        <>
          <Text style={estilos.nota}>
            Del {tablero!.desde} al {tablero!.hasta}
          </Text>
          <View style={estilos.cifras}>
            <Cifra nombre="Atendidos" valor={total.atendidos.toLocaleString('es-CO')} nota={`de ${turnos.toLocaleString('es-CO')} turnos`} />
            <Cifra nombre="Ausentes" valor={porcentaje(total.ausentes, turnos)} nota={`${total.ausentes} turnos`} />
            <Cifra nombre="Espera promedio" valor={`${total.esperaPromedioMin} min`} nota="hasta que lo llaman" />
            <Cifra nombre="Atención promedio" valor={`${total.atencionPromedioMin} min`} nota="en la ventanilla" />
            <Cifra nombre="Preferencial" valor={porcentaje(total.proporcionPreferencial, 1)} nota="de los turnos" />
            <Cifra nombre="Cancelados" valor={porcentaje(total.cancelados, turnos)} nota={`${total.cancelados} turnos`} />
          </View>
          {agencias.length > 1 && (
            <>
              <Text style={estilos.subtitulo}>Por agencia, de mayor a menor espera</Text>
              {agencias.map((a) => (
                <View key={a.agenciaId} style={estilos.fila} accessible accessibilityLabel={`${a.nombre}: espera ${a.esperaPromedioMin} minutos, ${a.atendidos} atendidos`}>
                  <Text style={estilos.nombre}>{a.nombre}</Text>
                  <Text style={estilos.detalle}>
                    {a.disponible
                      ? `Espera ${a.esperaPromedioMin} min · ${a.atendidos.toLocaleString('es-CO')} atendidos · ausentes ${porcentaje(a.ausentes, totalTurnos(a))}`
                      : 'Sin datos: la analítica no respondió'}
                  </Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

function Cifra({ nombre, valor, nota }: { nombre: string; valor: string; nota: string }) {
  return (
    <View style={estilos.cifra} accessible accessibilityLabel={`${nombre}: ${valor}, ${nota}`}>
      <Text style={estilos.nota}>{nombre}</Text>
      <Text style={estilos.valor}>{valor}</Text>
      <Text style={estilos.nota}>{nota}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto },
  subtitulo: { fontSize: texto.lg, fontWeight: '600', color: colores.texto, marginTop: espacio[5] },
  nota: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[1] },
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[3], marginTop: espacio[3] },
  cifra: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio,
    padding: espacio[3],
  },
  valor: { fontSize: texto.xl, fontWeight: '600', color: colores.texto },
  fila: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.borde, borderRadius: radio, padding: espacio[3], marginTop: espacio[2] },
  nombre: { fontSize: texto.md, fontWeight: '600', color: colores.texto },
  detalle: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[1] },
});
