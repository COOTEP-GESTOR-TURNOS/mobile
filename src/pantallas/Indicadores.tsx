import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { horaCorte, type TableroMensual } from '../api/demanda';
import { type OpcionesAnalitica, rangoDelMes } from '../api/filtrosAnalitica';
import type { AgenciaCatalogo } from '../api/catalogo';
import { mensajeDeError } from '../api/http';
import {
  type IndicadoresAgencia,
  indicadoresApi,
  porcentaje,
  type TableroIndicadores,
  totalTurnos,
  ultimosDias,
  type ValoresIndicadores,
} from '../api/indicadores';
import { fechaColombia } from '../api/recomendaciones';
import { useCatalogo } from '../api/useCatalogo';
import { useFiltrosAnalitica } from '../api/useFiltrosAnalitica';
import { useTableroMensual } from '../api/useTableroMensual';
import { Boton } from '../componentes/Boton';
import { CalendarioDemanda } from '../componentes/CalendarioDemanda';
import { Aviso } from '../componentes/Campo';
import { Desplegable } from '../componentes/Desplegable';
import { Opciones } from '../componentes/Opciones';
import { type AsignacionRol, useSesion } from '../sesion';
import { colores, espacio, radio, texto } from '../tema/tokens';

type Periodo = 'mes' | '7' | '30' | '90';
const PERIODOS: { id: Periodo; nombre: string }[] = [
  { id: 'mes', nombre: 'Mes del calendario' },
  { id: '7', nombre: '7 días' },
  { id: '30', nombre: '30 días' },
  { id: '90', nombre: '90 días' },
];

type Alterno = { clave: string; datos?: TableroIndicadores; error?: string };
type TableroPeriodo = Pick<TableroIndicadores, 'desde' | 'hasta' | 'agencias'>;

function agenciasPermitidas(agencias: AgenciaCatalogo[], roles: AsignacionRol[], superadmin: boolean): AgenciaCatalogo[] {
  if (superadmin) return agencias;
  const propias = new Set(roles.filter((rol) => rol.rol === 'ADMIN_AGENCIA').map((rol) => rol.agenciaId));
  return agencias.filter((agencia) => propias.has(agencia.id));
}

/** El superadministrador empieza con todas las agencias (ninguna elegida); el directivo, con la primera suya. */
function agenciaActual(permitidas: AgenciaCatalogo[], elegida: string, superadmin: boolean): AgenciaCatalogo | undefined {
  return permitidas.find((item) => item.id === elegida) ?? (superadmin ? undefined : permitidas[0]);
}

/** '': todas las agencias (solo el superadministrador); null: no hay agencia que consultar. */
function idConsulta(agencia: AgenciaCatalogo | undefined, superadmin: boolean): string | null {
  return agencia?.id ?? (superadmin ? '' : null);
}

/** Las agencias que puede consultar y la elegida. */
function useAmbitoIndicadores() {
  const { usuario } = useSesion();
  const catalogo = useCatalogo();
  const roles = usuario?.roles ?? [];
  const superadmin = roles.some((rol) => rol.rol === 'SUPERADMIN');
  const permitidas = agenciasPermitidas(catalogo.agencias, roles, superadmin);
  const [agenciaElegida, setAgenciaElegida] = useState('');
  const agencia = agenciaActual(permitidas, agenciaElegida, superadmin);
  return { superadmin, catalogo, permitidas, agencia, agenciaId: idConsulta(agencia, superadmin), setAgenciaElegida };
}

function rangoDelPeriodo(periodo: Periodo, mes: string) {
  return periodo === 'mes' ? rangoDelMes(mes) : ultimosDias(Number(periodo));
}

/** Los periodos de 7, 30 y 90 días se consultan aparte; el del mes sale del tablero mensual. */
function useIndicadoresAlternos(consulta: {
  periodo: Periodo;
  agenciaConsulta: string | null;
  desde: string;
  hasta: string;
  servicioId?: string;
  colaboradorId?: string;
  corte?: string | null;
}) {
  const { periodo, agenciaConsulta, desde, hasta, servicioId, colaboradorId, corte } = consulta;
  const [alterno, setAlterno] = useState<Alterno | null>(null);
  const [revision, setRevision] = useState(0);
  const claveAlterna = JSON.stringify([agenciaConsulta, desde, hasta, servicioId, colaboradorId, revision]);

  useEffect(() => {
    if (periodo === 'mes' || agenciaConsulta === null) return;
    let vigente = true;
    indicadoresApi
      .consultar({ desde, hasta, agenciaId: agenciaConsulta, servicioId, colaboradorId })
      .then((datos) => {
        if (!datos) throw new Error('Respuesta vacía');
        if (vigente) setAlterno({ clave: claveAlterna, datos });
      })
      .catch((err: unknown) => {
        if (vigente) setAlterno({ clave: claveAlterna, error: mensajeDeError(err, 'No se pudieron cargar los indicadores') });
      });
    return () => {
      vigente = false;
    };
  }, [periodo, agenciaConsulta, desde, hasta, servicioId, colaboradorId, claveAlterna, corte]);

  return {
    consultaAlterna: alterno?.clave === claveAlterna ? alterno : null,
    reintentarAlterno: () => setRevision((actual) => actual + 1),
  };
}

/** Filtros, tablero mensual y consulta del periodo para la agencia elegida. */
function useDatosIndicadores(agenciaId: string | null, mes: string, periodo: Periodo) {
  const { desde, hasta } = rangoDelPeriodo(periodo, mes);
  const filtros = useFiltrosAnalitica(agenciaId, { desde, hasta });
  const agenciaConsulta = filtros.listos ? agenciaId : null;
  const servicioId = filtros.servicio?.id;
  const colaboradorId = filtros.colaborador?.id;
  const mensual = useTableroMensual(mes, agenciaConsulta, servicioId, periodo === 'mes' ? colaboradorId : undefined);
  const alternos = useIndicadoresAlternos({ periodo, agenciaConsulta, desde, hasta, servicioId, colaboradorId, corte: mensual.datos?.actualizadoEn });
  return { filtros, agenciaConsulta, servicioId, colaboradorId, mensual, ...alternos };
}

type Ambito = ReturnType<typeof useAmbitoIndicadores>;
type Datos = ReturnType<typeof useDatosIndicadores>;
type Filtros = Datos['filtros'];

/** RF-19 en el teléfono: el resumen del tablero web, con la lista de agencias para el superadministrador. */
export function Indicadores() {
  const ambito = useAmbitoIndicadores();
  const { agencia, agenciaId } = ambito;
  const hoy = fechaColombia();
  const [mes, setMes] = useState(() => hoy.slice(0, 7));
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const datos = useDatosIndicadores(agenciaId, mes, periodo);
  const mensual = datos.mensual.datos;

  return (
    <View>
      <Text style={estilos.titulo}>{agencia ? `Indicadores · ${agencia.nombre}` : 'Indicadores'}</Text>
      <FiltrosIndicadores ambito={ambito} datos={datos} periodo={periodo} setPeriodo={setPeriodo} />
      <AvisosIndicadores ambito={ambito} datos={datos} periodo={periodo} />
      <ResultadosIndicadores periodo={periodo} mensual={mensual} alterna={datos.consultaAlterna} />
      {agenciaId !== null && (
        <CalendarioDemanda key={agenciaId} hoy={hoy} mes={mes} cambiarMes={setMes} datos={mensual?.calendario ?? null} alcance={alcanceCalendario(datos.filtros)} />
      )}
    </View>
  );
}

function opcionesAgencias(superadmin: boolean, permitidas: AgenciaCatalogo[]): { id: string; nombre: string }[] {
  return [...(superadmin ? [{ id: '', nombre: 'Todas las agencias' }] : []), ...permitidas];
}

function FiltrosIndicadores({ ambito, datos, periodo, setPeriodo }: { ambito: Ambito; datos: Datos; periodo: Periodo; setPeriodo: (periodo: Periodo) => void }) {
  const { superadmin, permitidas, agenciaId } = ambito;
  const { filtros } = datos;
  return (
    <>
      {(superadmin || permitidas.length > 1) && (
        <Desplegable titulo="Agencia" opciones={opcionesAgencias(superadmin, permitidas)} valor={agenciaId ?? undefined} onCambio={ambito.setAgenciaElegida} />
      )}
      <Opciones titulo="Periodo" opciones={PERIODOS} valor={periodo} onCambio={setPeriodo} />
      {filtros.opciones && (
        <>
          <SelectorServicio servicios={filtros.opciones.servicios} servicioId={datos.servicioId} elegir={filtros.elegirServicio} />
          <SelectorColaborador
            colaboradores={filtros.opciones.colaboradores}
            colaboradorId={datos.colaboradorId}
            agenciaId={agenciaId}
            permitidas={permitidas}
            elegir={filtros.elegirColaborador}
          />
        </>
      )}
    </>
  );
}

function SelectorServicio({ servicios, servicioId, elegir }: { servicios: OpcionesAnalitica['servicios']; servicioId?: string; elegir: Filtros['elegirServicio'] }) {
  return (
    <Desplegable
      titulo="Servicio"
      opciones={[{ id: '', nombre: 'Todos los servicios' }, ...servicios]}
      valor={servicioId ?? ''}
      onCambio={elegir}
    />
  );
}

/** Con todas las agencias, cada colaborador muestra en qué agencias trabaja. */
function SelectorColaborador({ colaboradores, colaboradorId, agenciaId, permitidas, elegir }: {
  colaboradores: OpcionesAnalitica['colaboradores'];
  colaboradorId?: string;
  agenciaId: string | null;
  permitidas: AgenciaCatalogo[];
  elegir: Filtros['elegirColaborador'];
}) {
  const nombresAgencias = new Map(permitidas.map(({ id, nombre }) => [id, nombre]));
  return (
    <Desplegable
      titulo="Colaborador"
      opciones={[
        { id: '', nombre: 'Todos los colaboradores' },
        ...colaboradores.map(({ id, nombre, agenciaIds }) => ({
          id, nombre,
          detalle: agenciaId ? undefined : agenciaIds.map((idAgencia) => nombresAgencias.get(idAgencia)).filter(Boolean).join(', '),
        })),
      ]}
      valor={colaboradorId ?? ''}
      onCambio={elegir}
    />
  );
}

function AvisoReintentar({ error, reintentar }: { error?: string | null; reintentar: () => void }) {
  if (!error) return null;
  return (
    <>
      <Aviso>{error}</Aviso>
      <Boton titulo="Reintentar" variante="secundario" onPress={reintentar} />
    </>
  );
}

function sinAgencias(catalogo: Ambito['catalogo'], agenciaId: string | null): boolean {
  return !catalogo.cargando && !catalogo.error && agenciaId === null;
}

function cargandoAlterno(datos: Datos, periodo: Periodo): boolean {
  return datos.agenciaConsulta !== null && periodo !== 'mes' && !datos.consultaAlterna;
}

/** Carga mientras llegan los filtros, el tablero mensual o la consulta del periodo elegido. */
function cargandoIndicadores(datos: Datos, agenciaId: string | null, periodo: Periodo): boolean {
  if (agenciaId === null) return false;
  return datos.filtros.cargando || datos.mensual.cargando || cargandoAlterno(datos, periodo);
}

function AvisosIndicadores({ ambito, datos, periodo }: { ambito: Ambito; datos: Datos; periodo: Periodo }) {
  const { catalogo, agenciaId } = ambito;
  const { filtros, mensual } = datos;
  return (
    <>
      <AvisoReintentar error={catalogo.error} reintentar={catalogo.reintentar} />
      {sinAgencias(catalogo, agenciaId) && <Aviso tipo="info">No hay agencias disponibles en tu ámbito.</Aviso>}
      <AvisoReintentar error={filtros.error} reintentar={filtros.reintentar} />
      {cargandoIndicadores(datos, agenciaId, periodo) && <Text style={estilos.nota}>Cargando indicadores…</Text>}
      <AvisoReintentar error={mensual.error} reintentar={mensual.recargar} />
      {periodo !== 'mes' && <AvisoReintentar error={datos.consultaAlterna?.error} reintentar={datos.reintentarAlterno} />}
      <AvisoSimulados mensual={mensual.datos} periodo={periodo} />
    </>
  );
}

function AvisoSimulados({ mensual, periodo }: { mensual: TableroMensual | null; periodo: Periodo }) {
  if (mensual?.fuente !== 'SIMULADA') return null;
  const corte = mensual.actualizadoEn;
  const etiquetaCorte = periodo === 'mes' ? 'Último corte' : 'Corte del calendario';
  return <Aviso tipo="info">{`Datos simulados.${corte ? ` ${etiquetaCorte} ${horaCorte(corte)} (hora de Colombia).` : ''}`}</Aviso>;
}

/** El del mes viene del tablero mensual; los demás periodos, de la consulta aparte. */
function resultadoPeriodo(
  periodo: Periodo,
  mensual: TableroMensual | null,
  alterna: Alterno | null,
): { tablero: TableroPeriodo | null | undefined; total: ValoresIndicadores | undefined } {
  if (periodo === 'mes') return { tablero: mensual, total: mensual?.resumen };
  return { tablero: alterna?.datos, total: alterna?.datos?.total };
}

function ordenarPorEspera(agencias: IndicadoresAgencia[]): IndicadoresAgencia[] {
  return [...agencias].sort((a, b) => b.esperaPromedioMin - a.esperaPromedioMin);
}

function ResultadosIndicadores({ periodo, mensual, alterna }: { periodo: Periodo; mensual: TableroMensual | null; alterna: Alterno | null }) {
  const { tablero, total } = resultadoPeriodo(periodo, mensual, alterna);
  if (!total) return null;
  return (
    <>
      {tablero && tablero.desde <= tablero.hasta && <Text style={estilos.nota}>Del {tablero.desde} al {tablero.hasta}</Text>}
      <Resumen total={total} />
      <PorAgencia filas={tablero ? ordenarPorEspera(tablero.agencias) : []} />
    </>
  );
}

function Resumen({ total }: { total: ValoresIndicadores }) {
  const turnos = totalTurnos(total);
  return (
    <View style={estilos.cifras}>
      {total.solicitados != null && <Cifra nombre="Solicitados" valor={total.solicitados.toLocaleString('es-CO')} nota="incluye turnos pendientes" />}
      {total.pendientes != null && <Cifra nombre="Pendientes" valor={total.pendientes.toLocaleString('es-CO')} nota="turnos sin finalizar" />}
      <Cifra nombre="Atendidos" valor={total.atendidos.toLocaleString('es-CO')} nota={`de ${turnos.toLocaleString('es-CO')} finalizados`} />
      <Cifra nombre="Ausentes" valor={porcentaje(total.ausentes, turnos)} nota={`${total.ausentes} turnos`} />
      <Cifra nombre="Espera promedio" valor={`${total.esperaPromedioMin} min`} nota="hasta que lo llaman" />
      <Cifra nombre="Atención promedio" valor={`${total.atencionPromedioMin} min`} nota="en la ventanilla" />
      <Cifra nombre="Preferencial" valor={porcentaje(total.proporcionPreferencial, 1)} nota="de los turnos" />
      <Cifra nombre="Cancelados" valor={porcentaje(total.cancelados, turnos)} nota={`${total.cancelados} turnos`} />
    </View>
  );
}

/** Solo con dos o más agencias: de mayor a menor espera. */
function PorAgencia({ filas }: { filas: IndicadoresAgencia[] }) {
  if (filas.length <= 1) return null;
  return (
    <>
      <Text style={estilos.subtitulo}>Por agencia, de mayor a menor espera</Text>
      {filas.map((a) => (
        <FilaAgencia key={a.agenciaId} agencia={a} />
      ))}
    </>
  );
}

function FilaAgencia({ agencia: a }: { agencia: IndicadoresAgencia }) {
  return (
    <View style={estilos.fila}>
      <Text style={estilos.nombre}>{a.nombre}</Text>
      <Text style={estilos.detalle}>
        {a.disponible
          ? `Espera ${a.esperaPromedioMin} min · ${a.atendidos.toLocaleString('es-CO')} atendidos · ${a.ausentes.toLocaleString('es-CO')} ausentes (${porcentaje(a.ausentes, totalTurnos(a))}) · ${a.cancelados.toLocaleString('es-CO')} cancelados`
          : 'Sin datos: la analítica no respondió'}
      </Text>
      {a.disponible && a.solicitados != null && a.pendientes != null && (
        <Text style={estilos.detalle}>{a.solicitados.toLocaleString('es-CO')} solicitados · {a.pendientes.toLocaleString('es-CO')} pendientes</Text>
      )}
    </View>
  );
}

/** Lo que filtra el calendario: el servicio elegido; los colaboradores no cambian la demanda. */
function alcanceCalendario(filtros: Filtros): string {
  return [filtros.servicio?.nombre, filtros.colaborador && 'Todos los colaboradores'].filter(Boolean).join(' · ');
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
