import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mensajeDeError } from '../api/http';
import { fechaColombia, type FranjaRecomendada, type RecomendacionHorario, recomendacionesApi, textoEspera } from '../api/recomendaciones';
import { colores, espacio, radio, texto } from '../tema/tokens';
import { Opciones } from './Opciones';

const DIAS: { id: '0' | '1'; nombre: string }[] = [
  { id: '0', nombre: 'Hoy' },
  { id: '1', nombre: 'Mañana' },
];

/** Consulta la recomendación de la fila y el día; ignora respuestas de una fila o un día que ya no está elegido. */
function useRecomendacion(agenciaId: string, servicioId: string, dia: '0' | '1') {
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

  return { datos, error, cargando };
}

/** RF-10 en el teléfono: las tres franjas con menor espera histórica para la fila elegida. */
export function MejorHorario({ agenciaId, servicioId }: { agenciaId: string; servicioId: string }) {
  const [dia, setDia] = useState<'0' | '1'>('0');
  const { datos, error, cargando } = useRecomendacion(agenciaId, servicioId, dia);

  return (
    <View style={estilos.caja}>
      <Text style={estilos.titulo} accessibilityRole="header">
        Mejor hora para ir
      </Text>
      <Opciones titulo="Día" opciones={DIAS} valor={dia} onCambio={setDia} />
      <View accessibilityLiveRegion="polite">
        {cargando ? <Text style={estilos.nota}>Buscando las franjas con menos espera…</Text> : <Resultado datos={datos} error={error} dia={dia} />}
      </View>
      {datos && (
        <Text style={estilos.nota}>
          Horario de atención: {datos.horario.apertura} a {datos.horario.cierre}. Es la espera mediana de días parecidos, no una promesa.
        </Text>
      )}
    </View>
  );
}

/** Sin franjas que mostrar aunque la recomendación esté disponible. */
function mensajeSinFranjas(datos: RecomendacionHorario | null, dia: '0' | '1'): string | null {
  if (!datos?.disponible || datos.franjas.length > 0) return null;
  return dia === '0' ? 'Hoy ya no quedan franjas con datos suficientes. Mira las de mañana.' : 'Aún no hay historial suficiente para ese día.';
}

/** Los mensajes que explican por qué no hay franjas (o el error de la consulta). */
function mensajesVacios(datos: RecomendacionHorario | null, error: string | null, dia: '0' | '1'): string[] {
  const sinFranjas = mensajeSinFranjas(datos, dia);
  return [
    ...(error ? [error] : []),
    ...(datos && !datos.disponible ? ['La recomendación no está disponible ahora. Puedes pedir tu turno igual.'] : []),
    ...(sinFranjas ? [sinFranjas] : []),
  ];
}

function Resultado({ datos, error, dia }: { datos: RecomendacionHorario | null; error: string | null; dia: '0' | '1' }) {
  const franjas = datos?.disponible ? datos.franjas : [];
  return (
    <>
      {mensajesVacios(datos, error, dia).map((mensaje) => (
        <Text key={mensaje} style={estilos.nota}>
          {mensaje}
        </Text>
      ))}
      {franjas.map((f, i) => (
        <Franja key={f.desde} franja={f} posicion={i + 1} />
      ))}
    </>
  );
}

/** La primera franja es la recomendada: se destaca en dorado. */
function Franja({ franja: f, posicion }: { franja: FranjaRecomendada; posicion: number }) {
  const recomendada = posicion === 1;
  return (
    <View
      style={[estilos.franja, recomendada && estilos.franjaRecomendada]}
      accessible
      accessibilityLabel={`Opción ${posicion}${recomendada ? ', recomendada' : ''}: de ${f.desde} a ${f.hasta}, ${textoEspera(f.esperaMedianaMin)}`}
    >
      <View style={estilos.encabezadoFranja}>
        <Text style={estilos.hora}>
          {posicion}. {f.desde} a {f.hasta}
        </Text>
        {recomendada && <Text style={estilos.recomendada}>Recomendada</Text>}
      </View>
      <Text style={estilos.espera}>{textoEspera(f.esperaMedianaMin)}</Text>
      <Text style={estilos.nota}>según {f.turnos} turnos anteriores</Text>
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
  franja: {
    padding: espacio[3],
    marginTop: espacio[2],
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio,
    backgroundColor: colores.superficie,
  },
  // La mejor franja se destaca en dorado; el texto «Recomendada» dice lo mismo que el color.
  franjaRecomendada: { borderColor: colores.dorado, backgroundColor: colores.doradoSuave },
  encabezadoFranja: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: espacio[2] },
  recomendada: {
    color: colores.doradoOscuro,
    fontSize: texto.xs,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: colores.dorado,
    borderRadius: 999,
    paddingHorizontal: espacio[2],
    paddingVertical: 2,
    overflow: 'hidden',
  },
  hora: { fontSize: texto.md, fontWeight: '600', color: colores.texto },
  espera: { fontSize: texto.md, color: colores.texto },
  nota: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[2] },
});
