import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { horaCorte } from '../api/demanda';
import { rangoDelMes } from '../api/filtrosAnalitica';
import { mensajeDeError } from '../api/http';
import { indicadoresApi, porcentaje, type TableroIndicadores, totalTurnos, ultimosDias } from '../api/indicadores';
import { fechaColombia } from '../api/recomendaciones';
import { useCatalogo } from '../api/useCatalogo';
import { useFiltrosAnalitica } from '../api/useFiltrosAnalitica';
import { useTableroMensual } from '../api/useTableroMensual';
import { Boton } from '../componentes/Boton';
import { CalendarioDemanda } from '../componentes/CalendarioDemanda';
import { Aviso } from '../componentes/Campo';
import { Desplegable } from '../componentes/Desplegable';
import { Opciones } from '../componentes/Opciones';
import { useSesion } from '../sesion';
import { colores, espacio, radio, texto } from '../tema/tokens';

type Periodo = 'mes' | '7' | '30' | '90';
const PERIODOS: { id: Periodo; nombre: string }[] = [
  { id: 'mes', nombre: 'Mes del calendario' },
  { id: '7', nombre: '7 días' },
  { id: '30', nombre: '30 días' },
  { id: '90', nombre: '90 días' },
];

/** RF-19 en el teléfono: el resumen del tablero web, con la lista de agencias para el superadministrador. */
export function Indicadores() {
  const { usuario } = useSesion();
  const roles = usuario?.roles ?? [];
  const superadmin = roles.some((rol) => rol.rol === 'SUPERADMIN');
  const propias = new Set(roles.filter((rol) => rol.rol === 'ADMIN_AGENCIA').map((rol) => rol.agenciaId));
  const { agencias, cargando: cargandoAgencias, error: errorCatalogo, reintentar: recargarCatalogo } = useCatalogo();
  const permitidas = superadmin ? agencias : agencias.filter((agencia) => propias.has(agencia.id));
  const [agenciaElegida, setAgenciaElegida] = useState('');
  const agencia = permitidas.find((item) => item.id === agenciaElegida) ?? (superadmin ? undefined : permitidas[0]);
  const agenciaId = agencia?.id ?? (superadmin ? '' : null);
  const hoy = fechaColombia();
  const [mes, setMes] = useState(() => hoy.slice(0, 7));
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const { desde, hasta } = periodo === 'mes' ? rangoDelMes(mes) : ultimosDias(Number(periodo));
  const filtros = useFiltrosAnalitica(agenciaId, { desde, hasta });
  const { servicio, colaborador } = filtros;
  const agenciaConsulta = filtros.listos ? agenciaId : null;
  const servicioId = servicio?.id;
  const colaboradorId = colaborador?.id;
  const { datos: mensual, cargando, error, recargar } = useTableroMensual(
    mes, agenciaConsulta, servicioId, periodo === 'mes' ? colaboradorId : undefined,
  );
  const [alterno, setAlterno] = useState<{ clave: string; datos?: TableroIndicadores; error?: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const claveAlterna = JSON.stringify([agenciaConsulta, desde, hasta, servicioId, colaboradorId, revision]);
  const corte = mensual?.actualizadoEn;
  const etiquetaCorte = periodo === 'mes' ? 'Último corte' : 'Corte del calendario';

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

  const consultaAlterna = alterno?.clave === claveAlterna ? alterno : null;
  const tablero = periodo === 'mes' ? mensual : consultaAlterna?.datos;
  const total = periodo === 'mes' ? mensual?.resumen : consultaAlterna?.datos?.total;
  const turnos = total ? totalTurnos(total) : 0;
  const filas = tablero ? [...tablero.agencias].sort((a, b) => b.esperaPromedioMin - a.esperaPromedioMin) : [];
  const opcionesAgencias = [...(superadmin ? [{ id: '', nombre: 'Todas las agencias' }] : []), ...permitidas];
  const nombresAgencias = new Map(permitidas.map(({ id, nombre }) => [id, nombre]));
  const alcanceCalendario = [servicio?.nombre, colaborador && 'Todos los colaboradores'].filter(Boolean).join(' · ');

  return (
    <View>
      <Text style={estilos.titulo}>{agencia ? `Indicadores · ${agencia.nombre}` : 'Indicadores'}</Text>
      {(superadmin || permitidas.length > 1) && (
        <Desplegable titulo="Agencia" opciones={opcionesAgencias} valor={agenciaId ?? undefined} onCambio={setAgenciaElegida} />
      )}
      <Opciones titulo="Periodo" opciones={PERIODOS} valor={periodo} onCambio={setPeriodo} />
      {filtros.opciones && (
        <>
          <Desplegable
            titulo="Servicio"
            opciones={[{ id: '', nombre: 'Todos los servicios' }, ...filtros.opciones.servicios]}
            valor={servicioId ?? ''}
            onCambio={filtros.elegirServicio}
          />
          <Desplegable
            titulo="Colaborador"
            opciones={[
              { id: '', nombre: 'Todos los colaboradores' },
              ...filtros.opciones.colaboradores.map(({ id, nombre, agenciaIds }) => ({
                id, nombre,
                detalle: agenciaId ? undefined : agenciaIds.map((idAgencia) => nombresAgencias.get(idAgencia)).filter(Boolean).join(', '),
              })),
            ]}
            valor={colaboradorId ?? ''}
            onCambio={filtros.elegirColaborador}
          />
        </>
      )}
      {errorCatalogo && <><Aviso>{errorCatalogo}</Aviso><Boton titulo="Reintentar" variante="secundario" onPress={recargarCatalogo} /></>}
      {!cargandoAgencias && !errorCatalogo && agenciaId === null && <Aviso tipo="info">No hay agencias disponibles en tu ámbito.</Aviso>}
      {filtros.error && <><Aviso>{filtros.error}</Aviso><Boton titulo="Reintentar" variante="secundario" onPress={filtros.reintentar} /></>}
      {agenciaId !== null && (filtros.cargando || cargando || (agenciaConsulta !== null && periodo !== 'mes' && !consultaAlterna)) && <Text style={estilos.nota}>Cargando indicadores…</Text>}
      {error && <><Aviso>{error}</Aviso><Boton titulo="Reintentar" variante="secundario" onPress={recargar} /></>}
      {periodo !== 'mes' && consultaAlterna?.error && (
        <><Aviso>{consultaAlterna.error}</Aviso><Boton titulo="Reintentar" variante="secundario" onPress={() => setRevision((actual) => actual + 1)} /></>
      )}
      {mensual?.fuente === 'SIMULADA' && <Aviso tipo="info">{`Datos simulados.${corte ? ` ${etiquetaCorte} ${horaCorte(corte)} (hora de Colombia).` : ''}`}</Aviso>}
      {total && (
        <>
          {tablero && tablero.desde <= tablero.hasta && <Text style={estilos.nota}>Del {tablero.desde} al {tablero.hasta}</Text>}
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
          {filas.length > 1 && (
            <>
              <Text style={estilos.subtitulo}>Por agencia, de mayor a menor espera</Text>
              {filas.map((a) => (
                <View key={a.agenciaId} style={estilos.fila}>
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
              ))}
            </>
          )}
        </>
      )}
      {agenciaId !== null && <CalendarioDemanda key={agenciaId} hoy={hoy} mes={mes} cambiarMes={setMes} datos={mensual?.calendario ?? null} alcance={alcanceCalendario} />}
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
