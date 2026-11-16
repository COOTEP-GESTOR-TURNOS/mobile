import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mensajeDeError } from '../api/http';
import { fechaColombia, type RecomendacionHorario, recomendacionesApi, textoEspera } from '../api/recomendaciones';
import { colores, espacio, radio, texto } from '../tema/tokens';
import { Opciones } from './Opciones';

const DIAS: { id: '0' | '1'; nombre: string }[] = [
  { id: '0', nombre: 'Hoy' },
  { id: '1', nombre: 'Mañana' },
];

/** RF-10 en el teléfono: las tres franjas con menor espera histórica para la fila elegida. */
export function MejorHorario({ agenciaId, servicioId }: { agenciaId: string; servicioId: string }) {
  const [dia, setDia] = useState<'0' | '1'>('0');
  const [datos, setDatos] = useState<RecomendacionHorario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!agenciaId || !servicioId) return;
    let vigente = true;
    setCargando(true);
    setError(null);
    recomendacionesApi
      .consultar(agenciaId, servicioId, fechaColombia(Number(dia)))
      .then((r) => vigente && setDatos(r))
      .catch((err: unknown) => vigente && setError(mensajeDeError(err, 'No se pudo consultar la recomendación')))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [agenciaId, servicioId, dia]);

  return (
    <View style={estilos.caja}>
      <Text style={estilos.titulo} accessibilityRole="header">
        Mejor hora para ir
      </Text>
      <Opciones titulo="Día" opciones={DIAS} valor={dia} onCambio={setDia} />
      <View accessibilityLiveRegion="polite">
        {cargando && <Text style={estilos.nota}>Buscando las franjas con menos espera…</Text>}
        {!cargando && error && <Text style={estilos.nota}>{error}</Text>}
        {!cargando && datos && !datos.disponible && <Text style={estilos.nota}>La recomendación no está disponible ahora. Puedes pedir tu turno igual.</Text>}
        {!cargando && datos?.disponible && datos.franjas.length === 0 && (
          <Text style={estilos.nota}>{dia === '0' ? 'Hoy ya no quedan franjas con datos suficientes. Mira las de mañana.' : 'Aún no hay historial suficiente para ese día.'}</Text>
        )}
        {!cargando &&
          datos?.disponible &&
          datos.franjas.map((f, i) => (
            <View key={f.desde} style={estilos.franja} accessible accessibilityLabel={`Opción ${i + 1}: de ${f.desde} a ${f.hasta}, ${textoEspera(f.esperaMedianaMin)}`}>
              <Text style={estilos.hora}>
                {i + 1}. {f.desde} a {f.hasta}
              </Text>
              <Text style={estilos.espera}>{textoEspera(f.esperaMedianaMin)}</Text>
              <Text style={estilos.nota}>según {f.turnos} turnos anteriores</Text>
            </View>
          ))}
      </View>
      {datos && (
        <Text style={estilos.nota}>
          Horario de atención: {datos.horario.apertura} a {datos.horario.cierre}. Es la espera mediana de días parecidos, no una promesa.
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio,
    padding: espacio[4],
    marginTop: espacio[4],
    backgroundColor: colores.superficie,
  },
  titulo: { fontSize: texto.lg, fontWeight: '600', color: colores.texto },
  franja: { paddingVertical: espacio[2], borderBottomWidth: 1, borderBottomColor: colores.borde },
  hora: { fontSize: texto.md, fontWeight: '600', color: colores.texto },
  espera: { fontSize: texto.md, color: colores.texto },
  nota: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[2] },
});
