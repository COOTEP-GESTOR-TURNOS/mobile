import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ACCIONES_ALERTA, auditoriaApi, describirDetalle, type EntradaAuditoria, horaColombia, NOMBRE_ACCION } from '../api/auditoria';
import { mensajeDeError } from '../api/http';
import { fechaColombia } from '../api/recomendaciones';
import { useCatalogo } from '../api/useCatalogo';
import { Boton } from '../componentes/Boton';
import { Aviso } from '../componentes/Campo';
import { Desplegable } from '../componentes/Desplegable';
import { Opciones } from '../componentes/Opciones';
import { colores, espacio, radio, texto } from '../tema/tokens';

const DIAS: { id: '0' | '-1'; nombre: string }[] = [
  { id: '0', nombre: 'Hoy' },
  { id: '-1', nombre: 'Ayer' },
];

/** RF-20 en el teléfono: la auditoría de un ámbito y un día, solo para el superadministrador. */
export function Auditoria() {
  const { agencias } = useCatalogo();
  const [ambito, setAmbito] = useState('GLOBAL');
  const [dia, setDia] = useState<'0' | '-1'>('0');
  const [entradas, setEntradas] = useState<EntradaAuditoria[]>([]);
  const [siguiente, setSiguiente] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultar = useCallback(
    (pagina?: string) => auditoriaApi.porAmbitoDia({ ambito, dia: fechaColombia(Number(dia)), siguiente: pagina }),
    [ambito, dia],
  );

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    consultar()
      .then((r) => {
        if (!vigente || !r) return;
        setEntradas(r.entradas);
        setSiguiente(r.siguiente);
      })
      .catch((err: unknown) => vigente && setError(mensajeDeError(err)))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [consultar]);

  async function cargarMas() {
    if (!siguiente) return;
    setCargando(true);
    try {
      const r = await consultar(siguiente);
      if (r) {
        setEntradas((actuales) => [...actuales, ...r.entradas]);
        setSiguiente(r.siguiente);
      }
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <View>
      <Text style={estilos.titulo}>Auditoría</Text>
      <Text style={estilos.nota}>Solo lectura: nadie puede editar ni borrar estos registros.</Text>
      <Desplegable
        titulo="Ámbito"
        opciones={[{ id: 'GLOBAL', nombre: 'Global' }, ...agencias.map((a) => ({ id: a.id, nombre: a.nombre }))]}
        valor={ambito}
        onCambio={setAmbito}
      />
      <Opciones titulo="Día" opciones={DIAS} valor={dia} onCambio={setDia} />
      {error && <Aviso>{error}</Aviso>}
      <Text style={estilos.subtitulo}>
        {entradas.length} {entradas.length === 1 ? 'registro' : 'registros'}
        {siguiente ? ' (hay más)' : ''}
      </Text>
      {!cargando && entradas.length === 0 && !error && <Text style={estilos.nota}>No hay registros ese día.</Text>}
      {entradas.map((e) => (
        <View
          key={`${e.ocurridoEn}-${e.accion}-${e.objetivoId}`}
          style={[estilos.registro, ACCIONES_ALERTA.has(e.accion) && { borderLeftColor: colores.error }]}
          accessible
          accessibilityLabel={`${horaColombia(e.ocurridoEn)}, ${NOMBRE_ACCION[e.accion] ?? e.accion}, ${e.actor.nombre ?? 'correo desconocido'}`}
        >
          <Text style={estilos.accion}>
            {horaColombia(e.ocurridoEn)} · {NOMBRE_ACCION[e.accion] ?? e.accion}
          </Text>
          <Text style={estilos.nota}>
            {e.actor.nombre ?? (e.actor.rol === 'SISTEMA' ? 'Sistema (automático)' : 'Correo desconocido')}
            {e.actor.rol ? ` · ${e.actor.rol}` : ''}
          </Text>
          <Text style={estilos.nota}>
            {e.objetivoTipo ? `${e.objetivoTipo}: ` : ''}
            {e.objetivoId}
          </Text>
          {describirDetalle(e.detalle) ? <Text style={estilos.nota}>{describirDetalle(e.detalle)}</Text> : null}
        </View>
      ))}
      {cargando && <Text style={estilos.nota}>Cargando…</Text>}
      {siguiente && !cargando && <Boton titulo="Cargar más" variante="secundario" onPress={() => void cargarMas()} />}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto },
  subtitulo: { fontSize: texto.lg, fontWeight: '600', color: colores.texto, marginTop: espacio[4] },
  nota: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[1] },
  registro: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderLeftWidth: 4,
    borderLeftColor: colores.primario,
    borderRadius: radio,
    padding: espacio[3],
    marginTop: espacio[2],
  },
  accion: { fontSize: texto.md, fontWeight: '600', color: colores.texto },
});
