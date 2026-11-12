import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorApi } from '../api/http';
import { AGENCIAS, SERVICIOS, Turno, turnosApi } from '../api/turnos';
import { Boton } from '../componentes/Boton';
import { TarjetaTurno } from '../componentes/TarjetaTurno';
import { useSesion } from '../sesion';
import { colores, espacio, texto } from '../tema/tokens';

/** CU-04 en el teléfono: las mismas acciones del panel web del funcionario. */
export function Funcionario() {
  const { usuario } = useSesion();
  const ambito = usuario?.roles.find((r) => r.rol === 'FUNCIONARIO' || r.rol === 'ADMIN_AGENCIA');
  const agenciaId = ambito?.agenciaId ?? '';
  const servicioId = ambito?.servicioId ?? SERVICIOS[0].id;
  const [actual, setActual] = useState<Turno | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function ejecutar(nombre: string, operacion: () => Promise<Turno | null>) {
    setAccion(nombre);
    setMensaje(null);
    try {
      const resultado = await operacion();
      if (nombre === 'llamar' && !resultado) setMensaje('No hay turnos en espera.');
      setActual(resultado);
    } catch (err) {
      setMensaje(err instanceof ErrorApi ? err.problema.detail ?? err.message : 'No se pudo completar la acción');
    } finally {
      setAccion(null);
    }
  }

  return (
    <View>
      <Text style={estilos.titulo}>Agencia {AGENCIAS.find((a) => a.id === agenciaId)?.nombre ?? 'sin asignar'}</Text>
      <Text style={estilos.subtitulo}>Fila: {SERVICIOS.find((s) => s.id === servicioId)?.nombre}</Text>
      <Boton titulo="Llamar siguiente" cargando={accion === 'llamar'} onPress={() => void ejecutar('llamar', () => turnosApi.llamarSiguiente(agenciaId, servicioId))} />
      {mensaje && (
        <Text style={estilos.mensaje} accessibilityLiveRegion="polite">
          {mensaje}
        </Text>
      )}
      {actual && (
        <View style={{ marginTop: espacio[4] }}>
          <TarjetaTurno turno={actual} titulo="Turno en ventanilla" />
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
});
