import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, Vibration, View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { almacenLocal } from '../almacenamiento/local';
import { ErrorApi } from '../api/http';
import { agenciasAbiertas, describirFila, servicioParaAgencia, serviciosDe } from '../api/catalogo';
import { avisoDeCambio, Turno, turnosApi } from '../api/turnos';
import { useCatalogo } from '../api/useCatalogo';
import { Boton } from '../componentes/Boton';
import { MejorHorario } from '../componentes/MejorHorario';
import { Desplegable } from '../componentes/Desplegable';
import { TarjetaTurno } from '../componentes/TarjetaTurno';
import { API_URL } from '../config';
import { useSesion } from '../sesion';
import { colores, espacio, texto } from '../tema/tokens';

/** CU-02 y CU-03 en el teléfono: pedir, seguir, confirmar y cancelar el turno. */
export function Asociado() {
  const { usuario } = useSesion();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [desactualizado, setDesactualizado] = useState<string | undefined>();
  const catalogo = useCatalogo();
  const abiertas = useMemo(() => agenciasAbiertas(catalogo.agencias), [catalogo.agencias]);
  const [agenciaId, setAgenciaId] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [agenciaGuardada, setAgenciaGuardada] = useState<string | null>(null);
  const [preferencial, setPreferencial] = useState(false);
  const [accion, setAccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const claveIdempotencia = useRef(Crypto.randomUUID());
  const estadoAnterior = useRef<string | null>(null);
  const socket = useRef<Socket | null>(null);

  const refrescar = useCallback(async () => {
    try {
      const actual = await turnosApi.miTurno();
      setTurno(actual);
      setDesactualizado(undefined);
      await almacenLocal.guardarUltimoTurno(actual);
    } catch (err) {
      if (err instanceof ErrorApi && err.status === 404) {
        setTurno(null);
        await almacenLocal.guardarUltimoTurno(null);
        return;
      }
      // Sin conexión: muestra el último estado guardado en SQLite.
      const guardado = await almacenLocal.leerUltimoTurno();
      if (guardado) {
        setTurno(guardado.turno);
        setDesactualizado(new Date(guardado.actualizadoEn).toLocaleTimeString());
      }
    }
  }, []);

  useEffect(() => {
    void refrescar();
    void almacenLocal.leerPreferencia('agencia').then(setAgenciaGuardada);
  }, [refrescar]);

  useEffect(() => {
    if (!usuario) return;
    const conexion = io(API_URL, { path: '/socket.io', auth: { token: usuario.token }, transports: ['websocket'] });
    // El aviso trae el turno: si quedó ausente por un vencimiento, se explica y vibra.
    conexion.on('turno:estado', (cambio: Turno) => {
      const texto = avisoDeCambio(cambio);
      setAviso(texto);
      if (cambio.estado === 'AUSENTE') Vibration.vibrate(500);
      void refrescar();
    });
    conexion.on('fila:actualizada', () => void refrescar());
    socket.current = conexion;
    return () => {
      conexion.disconnect();
    };
  }, [usuario, refrescar]);

  useEffect(() => {
    if (!turno) return;
    socket.current?.emit('fila:suscribir', { agenciaId: turno.agenciaId, servicioId: turno.servicioId });
    // Aviso táctil cuando el turno queda próximo o lo llaman.
    if (estadoAnterior.current !== turno.estado && (turno.estado === 'PROXIMO' || turno.estado === 'LLAMADO')) {
      Vibration.vibrate([0, 300, 150, 300]);
    }
    estadoAnterior.current = turno.estado;
  }, [turno]);

  // Al llegar el catálogo elige la última agencia usada (si sigue abierta) o la primera.
  useEffect(() => {
    if (agenciaId || abiertas.length === 0) return;
    const inicial = abiertas.find((a) => a.id === agenciaGuardada)?.id ?? abiertas[0].id;
    setAgenciaId(inicial);
    setServicioId(servicioParaAgencia(abiertas, inicial, undefined) ?? '');
  }, [abiertas, agenciaGuardada, agenciaId]);

  function elegirAgencia(id: string) {
    setAgenciaId(id);
    setServicioId(servicioParaAgencia(abiertas, id, servicioId) ?? '');
  }

  async function ejecutar(nombre: string, operacion: () => Promise<unknown>) {
    setAccion(nombre);
    setError(null);
    try {
      await operacion();
      await refrescar();
    } catch (err) {
      setError(err instanceof ErrorApi ? err.problema.detail ?? err.message : 'No se pudo completar la acción');
    } finally {
      setAccion(null);
    }
  }

  function pedirTurno() {
    setAviso(null);
    void almacenLocal.guardarPreferencia('agencia', agenciaId);
    void ejecutar('pedir', async () => {
      await turnosApi.solicitar(agenciaId, servicioId, preferencial, claveIdempotencia.current);
      claveIdempotencia.current = Crypto.randomUUID();
    });
  }

  function cancelar() {
    if (!turno) return;
    Alert.alert('Cancelar turno', 'Perderás tu lugar en la fila.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cancelar turno', style: 'destructive', onPress: () => void ejecutar('cancelar', () => turnosApi.cancelar(turno.id)) },
    ]);
  }

  return (
    <View>
      {aviso && (
        <Text style={[estilos.aviso, aviso.includes('ausente') && { color: colores.error, borderColor: colores.error }]} accessibilityLiveRegion="assertive">
          {aviso}
        </Text>
      )}
      {error && (
        <Text style={estilos.error} accessibilityLiveRegion="assertive">
          {error}
        </Text>
      )}
      {turno ? (
        <View>
          <TarjetaTurno turno={turno} desactualizado={desactualizado} lugar={describirFila(catalogo.agencias, turno.agenciaId, turno.servicioId)} />
          {turno.estado === 'PROXIMO' && (
            <Boton titulo="Confirmo que voy" cargando={accion === 'confirmar'} onPress={() => void ejecutar('confirmar', () => turnosApi.confirmar(turno.id))} />
          )}
          {['SOLICITADO', 'EN_ESPERA', 'PROXIMO'].includes(turno.estado) && (
            <Boton titulo="Cancelar turno" variante="peligro" cargando={accion === 'cancelar'} onPress={cancelar} />
          )}
        </View>
      ) : (
        <View>
          <Text style={estilos.titulo}>Pedir turno</Text>
          {catalogo.cargando && <Text style={estilos.nota}>Cargando agencias…</Text>}
          {catalogo.error && (
            <>
              <Text style={estilos.error} accessibilityLiveRegion="assertive">
                {catalogo.error}
              </Text>
              <Boton titulo="Reintentar" variante="secundario" onPress={catalogo.reintentar} />
            </>
          )}
          {catalogo.desdeCopia && <Text style={estilos.nota}>Sin conexión: se muestran las agencias guardadas en el teléfono.</Text>}
          {!catalogo.cargando && !catalogo.error && abiertas.length === 0 && (
            <Text style={estilos.nota}>Ninguna agencia está atendiendo en este momento.</Text>
          )}
          {abiertas.length > 0 && (
            <>
              <Desplegable
                titulo="Agencia"
                marcador="Elige una agencia"
                opciones={abiertas.map((a) => ({ id: a.id, nombre: a.nombre }))}
                valor={agenciaId}
                onCambio={elegirAgencia}
              />
              {agenciaId ? (
                <Desplegable
                  titulo="Servicio"
                  marcador="Elige un servicio"
                  opciones={serviciosDe(abiertas, agenciaId).map((s) => ({
                    id: s.id,
                    nombre: s.nombre,
                    detalle: `${s.ventanillas} ${s.ventanillas === 1 ? 'ventanilla' : 'ventanillas'}`,
                  }))}
                  valor={servicioId}
                  onCambio={setServicioId}
                />
              ) : null}
              {agenciaId && servicioId ? <MejorHorario agenciaId={agenciaId} servicioId={servicioId} /> : null}
            </>
          )}
          <View style={estilos.preferencial}>
            <Switch value={preferencial} onValueChange={setPreferencial} accessibilityLabel="Necesito atención preferencial" />
            <Text style={estilos.textoPreferencial}>Necesito atención preferencial (gestante o persona con discapacidad)</Text>
          </View>
          <Boton titulo="Pedir turno" cargando={accion === 'pedir'} deshabilitado={!agenciaId || !servicioId} onPress={pedirTurno} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto },
  preferencial: { flexDirection: 'row', alignItems: 'center', gap: espacio[3], marginTop: espacio[4] },
  textoPreferencial: { flex: 1, color: colores.texto, fontSize: texto.sm },
  error: { color: colores.error, marginBottom: espacio[3] },
  aviso: {
    color: colores.info,
    borderWidth: 1,
    borderColor: colores.info,
    borderRadius: 8,
    padding: espacio[3],
    marginBottom: espacio[3],
    backgroundColor: colores.superficie,
  },
  nota: { color: colores.textoSecundario, fontSize: texto.sm, marginTop: espacio[3] },
});
