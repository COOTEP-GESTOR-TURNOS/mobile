import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorApi, mensajeDeError } from '../api/http';
import { describirFila, servicioParaAgencia } from '../api/catalogo';
import { Turno, turnosApi } from '../api/turnos';
import { useCatalogo } from '../api/useCatalogo';
import { Boton } from '../componentes/Boton';
import { Opciones } from '../componentes/Opciones';
import { TarjetaTurno } from '../componentes/TarjetaTurno';
import { useSesion } from '../sesion';
import { colores, espacio, texto } from '../tema/tokens';

/** CU-04 en el teléfono: las mismas acciones del panel web del funcionario. */
export function Funcionario() {
  const { usuario } = useSesion();
  const ambito = usuario?.roles.find((r) => r.rol === 'FUNCIONARIO' || r.rol === 'ADMIN_AGENCIA');
  const agenciaId = ambito?.agenciaId ?? '';
  const servicioFijo = ambito?.servicioId;
  const catalogo = useCatalogo();
  const agencia = catalogo.agencias.find((a) => a.id === agenciaId);
  const [servicioId, setServicioId] = useState(servicioFijo ?? '');

  // Sin servicio asignado por su rol, empieza en la primera fila de su agencia.
  useEffect(() => {
    if (!servicioId && agencia) setServicioId(servicioParaAgencia(catalogo.agencias, agencia.id, undefined) ?? '');
  }, [agencia, catalogo.agencias, servicioId]);
  const [actual, setActual] = useState<Turno | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  // El servidor sabe qué turno tiene este funcionario: se recupera al recargar o volver a la pantalla.
  useEffect(() => {
    let vigente = true;
    turnosApi
      .enVentanilla()
      .then((abierto) => {
        if (!vigente || !abierto) return;
        setActual((previo) => previo ?? abierto);
        setServicioId(abierto.servicioId); // el siguiente llamado sale de esa misma fila
      })
      .catch((err: unknown) => vigente && setMensaje(mensajeDeError(err)));
    return () => {
      vigente = false;
    };
  }, []);

  async function ejecutar(nombre: string, operacion: () => Promise<Turno | null>) {
    setAccion(nombre);
    setMensaje(null);
    try {
      const resultado = await operacion();
      if (nombre === 'llamar' && !resultado) setMensaje('No hay turnos en espera.');
      setActual(resultado);
    } catch (err) {
      setMensaje(err instanceof ErrorApi ? err.problema.detail ?? err.message : 'No se pudo completar la acción');
      // El turno pudo cambiar sin esta pantalla (venció, lo cerró el sistema o sigue abierto): se relee.
      await turnosApi.enVentanilla().then(setActual, () => undefined);
    } finally {
      setAccion(null);
    }
  }

  return (
    <View>
      <Text style={estilos.titulo}>{agencia?.nombre ?? (catalogo.cargando ? 'Cargando agencia…' : 'Agencia sin asignar')}</Text>
      {catalogo.error && <Text style={estilos.error}>{catalogo.error}</Text>}
      {!catalogo.cargando && !catalogo.error && !agencia && (
        <Text style={estilos.error}>Tu rol no tiene una agencia del catálogo. Pide al administrador que revise tu asignación.</Text>
      )}
      {agencia && servicioFijo && <Text style={estilos.subtitulo}>Fila: {agencia.servicios.find((s) => s.id === servicioFijo)?.nombre ?? 'no disponible'}</Text>}
      {agencia && !servicioFijo && <Opciones titulo="Fila que atiendo" opciones={agencia.servicios} valor={servicioId} onCambio={setServicioId} />}
      <Boton titulo="Llamar siguiente" cargando={accion === 'llamar'} deshabilitado={!servicioId || !agencia} onPress={() => void ejecutar('llamar', () => turnosApi.llamarSiguiente(agenciaId, servicioId))} />
      {mensaje && (
        <Text style={estilos.mensaje} accessibilityLiveRegion="polite">
          {mensaje}
        </Text>
      )}
      {actual && (
        <View style={{ marginTop: espacio[4] }}>
          <TarjetaTurno turno={actual} titulo="Turno en ventanilla" lugar={describirFila(catalogo.agencias, actual.agenciaId, actual.servicioId)} />
          {actual.estado === 'LLAMADO' && actual.tipoAtencion === 'PREFERENCIAL' && (
            <>
              <Boton titulo="Preferencial verificado" variante="secundario" cargando={accion === 'si'} onPress={() => void ejecutar('si', () => turnosApi.verificarPreferencial(actual.id, true))} />
              <Boton titulo="No aplica: a la fila general" variante="peligro" cargando={accion === 'no'} onPress={() => void ejecutar('no', () => turnosApi.verificarPreferencial(actual.id, false))} />
            </>
          )}
          {actual.estado === 'LLAMADO' && (
            <>
              <Boton titulo="Iniciar atención" cargando={accion === 'iniciar'} onPress={() => void ejecutar('iniciar', () => turnosApi.atender(actual.id, 'iniciar'))} />
              <Boton titulo="Marcar ausente" variante="peligro" cargando={accion === 'ausente'} onPress={() => void ejecutar('ausente', () => turnosApi.atender(actual.id, 'ausente'))} />
            </>
          )}
          {actual.estado === 'EN_ATENCION' && (
            <Boton titulo="Finalizar atención" cargando={accion === 'finalizar'} onPress={() => void ejecutar('finalizar', () => turnosApi.atender(actual.id, 'finalizar'))} />
          )}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto },
  subtitulo: { fontSize: texto.md, color: colores.textoSecundario, marginTop: espacio[1] },
  mensaje: { color: colores.textoSecundario, marginTop: espacio[3] },
  error: { color: colores.error, marginTop: espacio[3] },
});
