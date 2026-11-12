import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, Vibration, View } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { almacenLocal } from '../almacenamiento/local';
import { ErrorApi } from '../api/http';
import { AGENCIAS, SERVICIOS, Turno, turnosApi } from '../api/turnos';
import { Boton } from '../componentes/Boton';
import { TarjetaTurno } from '../componentes/TarjetaTurno';
import { API_URL } from '../config';
import { useSesion } from '../sesion';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

function Opciones({ titulo, opciones, valor, onCambio }: { titulo: string; opciones: { id: string; nombre: string }[]; valor: string; onCambio: (id: string) => void }) {
  return (
    <View>
      <Text style={estilos.etiqueta}>{titulo}</Text>
      <View style={estilos.opciones}>
        {opciones.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => onCambio(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: o.id === valor }}
            style={[estilos.opcion, o.id === valor && estilos.opcionElegida]}
          >
            <Text style={{ color: o.id === valor ? '#FFFFFF' : colores.texto }}>{o.nombre}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** CU-02 y CU-03 en el teléfono: pedir, seguir, confirmar y cancelar el turno. */
export function Asociado() {
  const { usuario } = useSesion();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [desactualizado, setDesactualizado] = useState<string | undefined>();
  const [agenciaId, setAgenciaId] = useState(AGENCIAS[0].id);
  const [servicioId, setServicioId] = useState(SERVICIOS[0].id);
  const [preferencial, setPreferencial] = useState(false);
  const [accion, setAccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    void almacenLocal.leerPreferencia('agencia').then((id) => id && setAgenciaId(id));
  }, [refrescar]);

  useEffect(() => {
    if (!usuario) return;
    const conexion = io(API_URL, { path: '/socket.io', auth: { token: usuario.token }, transports: ['websocket'] });
    conexion.on('turno:estado', () => void refrescar());
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
      {error && (
        <Text style={estilos.error} accessibilityLiveRegion="assertive">
          {error}
        </Text>
      )}
      {turno ? (
        <View>
          <TarjetaTurno turno={turno} desactualizado={desactualizado} />
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
          <Opciones titulo="Agencia" opciones={AGENCIAS} valor={agenciaId} onCambio={setAgenciaId} />
          <Opciones titulo="Servicio" opciones={SERVICIOS} valor={servicioId} onCambio={setServicioId} />
          <View style={estilos.preferencial}>
            <Switch value={preferencial} onValueChange={setPreferencial} accessibilityLabel="Necesito atención preferencial" />
            <Text style={estilos.textoPreferencial}>Necesito atención preferencial (gestante o persona con discapacidad)</Text>
          </View>
          <Boton titulo="Pedir turno" cargando={accion === 'pedir'} onPress={pedirTurno} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto },
  etiqueta: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[4], marginBottom: espacio[2] },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[2] },
  opcion: {
    minHeight: objetivoTactil,
    justifyContent: 'center',
    paddingHorizontal: espacio[4],
    borderRadius: radio,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  opcionElegida: { backgroundColor: colores.primario, borderColor: colores.primario },
  preferencial: { flexDirection: 'row', alignItems: 'center', gap: espacio[3], marginTop: espacio[4] },
  textoPreferencial: { flex: 1, color: colores.texto, fontSize: texto.sm },
  error: { color: colores.error, marginBottom: espacio[3] },
});
