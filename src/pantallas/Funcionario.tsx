import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ErrorApi } from '../api/http';
import { type AgenciaCatalogo, describirFila, servicioParaAgencia } from '../api/catalogo';
import { Turno, turnosApi } from '../api/turnos';
import { useCatalogo } from '../api/useCatalogo';
import { Boton } from '../componentes/Boton';
import { Opciones } from '../componentes/Opciones';
import { TarjetaTurno } from '../componentes/TarjetaTurno';
import { useSesion } from '../sesion';
import { colores, espacio, texto } from '../tema/tokens';

type Catalogo = ReturnType<typeof useCatalogo>;
type Ejecutar = (nombre: string, operacion: () => Promise<Turno | null>) => Promise<void>;

/** La agencia y la fila del funcionario según su rol; sin servicio fijo, empieza en la primera fila de su agencia. */
function useFilaFuncionario() {
  const { usuario } = useSesion();
  const ambito = usuario?.roles.find((r) => r.rol === 'FUNCIONARIO' || r.rol === 'ADMIN_AGENCIA');
  const agenciaId = ambito?.agenciaId ?? '';
  const servicioFijo = ambito?.servicioId;
  const catalogo = useCatalogo();
  const agencia = catalogo.agencias.find((a) => a.id === agenciaId);
  const [servicioId, setServicioId] = useState(servicioFijo ?? '');

  useEffect(() => {
    if (!servicioId && agencia) setServicioId(servicioParaAgencia(catalogo.agencias, agencia.id, undefined) ?? '');
  }, [agencia, catalogo.agencias, servicioId]);

  return { catalogo, agencia, agenciaId, servicioFijo, servicioId, setServicioId };
}

function textoDeError(err: unknown): string {
  return err instanceof ErrorApi ? err.problema.detail ?? err.message : 'No se pudo completar la acción';
}

function tituloAgencia(agencia: AgenciaCatalogo | undefined, cargando: boolean): string {
  return agencia?.nombre ?? (cargando ? 'Cargando agencia…' : 'Agencia sin asignar');
}

/** CU-04 en el teléfono: las mismas acciones del panel web del funcionario. */
export function Funcionario() {
  const { catalogo, agencia, agenciaId, servicioFijo, servicioId, setServicioId } = useFilaFuncionario();
  const [actual, setActual] = useState<Turno | null>(null);
  const [accion, setAccion] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const ejecutar: Ejecutar = async (nombre, operacion) => {
    setAccion(nombre);
    setMensaje(null);
    try {
      const resultado = await operacion();
      if (nombre === 'llamar' && !resultado) setMensaje('No hay turnos en espera.');
      setActual(resultado);
    } catch (err) {
      setMensaje(textoDeError(err));
    } finally {
      setAccion(null);
    }
  };

  return (
    <View>
      <Text style={estilos.titulo}>{tituloAgencia(agencia, catalogo.cargando)}</Text>
      <AvisosFuncionario catalogo={catalogo} conAgencia={Boolean(agencia)} />
      {agencia && <FilaQueAtiendo agencia={agencia} servicioFijo={servicioFijo} servicioId={servicioId} setServicioId={setServicioId} />}
      <Boton titulo="Llamar siguiente" cargando={accion === 'llamar'} deshabilitado={!servicioId || !agencia} onPress={() => void ejecutar('llamar', () => turnosApi.llamarSiguiente(agenciaId, servicioId))} />
      {mensaje && (
        <Text style={estilos.mensaje} accessibilityLiveRegion="polite">
          {mensaje}
        </Text>
      )}
      {actual && <TurnoEnVentanilla turno={actual} lugar={describirFila(catalogo.agencias, actual.agenciaId, actual.servicioId)} accion={accion} ejecutar={ejecutar} />}
    </View>
  );
}

function AvisosFuncionario({ catalogo, conAgencia }: { catalogo: Catalogo; conAgencia: boolean }) {
  return (
    <>
      {catalogo.error && <Text style={estilos.error}>{catalogo.error}</Text>}
      {!catalogo.cargando && !catalogo.error && !conAgencia && (
        <Text style={estilos.error}>Tu rol no tiene una agencia del catálogo. Pide al administrador que revise tu asignación.</Text>
      )}
    </>
  );
}

/** Con servicio fijo por su rol solo se muestra; si no, el funcionario elige la fila. */
function FilaQueAtiendo({ agencia, servicioFijo, servicioId, setServicioId }: {
  agencia: AgenciaCatalogo;
  servicioFijo?: string;
  servicioId: string;
  setServicioId: (id: string) => void;
}) {
  if (servicioFijo) {
    return <Text style={estilos.subtitulo}>Fila: {agencia.servicios.find((s) => s.id === servicioFijo)?.nombre ?? 'no disponible'}</Text>;
  }
  return <Opciones titulo="Fila que atiendo" opciones={agencia.servicios} valor={servicioId} onCambio={setServicioId} />;
}

/** Las acciones dependen del estado: verificar la atención preferencial, iniciar, marcar ausente o finalizar. */
function TurnoEnVentanilla({ turno: actual, lugar, accion, ejecutar }: { turno: Turno; lugar?: string; accion: string | null; ejecutar: Ejecutar }) {
  const llamado = actual.estado === 'LLAMADO';
  return (
    <View style={{ marginTop: espacio[4] }}>
      <TarjetaTurno turno={actual} titulo="Turno en ventanilla" lugar={lugar} />
      {llamado && actual.tipoAtencion === 'PREFERENCIAL' && (
        <>
          <Boton titulo="Preferencial verificado" variante="secundario" cargando={accion === 'si'} onPress={() => void ejecutar('si', () => turnosApi.verificarPreferencial(actual.id, true))} />
          <Boton titulo="No aplica: a la fila general" variante="peligro" cargando={accion === 'no'} onPress={() => void ejecutar('no', () => turnosApi.verificarPreferencial(actual.id, false))} />
        </>
      )}
      {llamado && (
        <>
          <Boton titulo="Iniciar atención" cargando={accion === 'iniciar'} onPress={() => void ejecutar('iniciar', () => turnosApi.atender(actual.id, 'iniciar'))} />
          <Boton titulo="Marcar ausente" variante="peligro" cargando={accion === 'ausente'} onPress={() => void ejecutar('ausente', () => turnosApi.atender(actual.id, 'ausente'))} />
        </>
      )}
      {actual.estado === 'EN_ATENCION' && (
        <Boton titulo="Finalizar atención" cargando={accion === 'finalizar'} onPress={() => void ejecutar('finalizar', () => turnosApi.atender(actual.id, 'finalizar'))} />
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
