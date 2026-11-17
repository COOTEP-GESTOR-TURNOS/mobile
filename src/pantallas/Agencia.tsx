import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  agenciasAdminApi,
  errorDeValor,
  resumenCierre,
  TEXTO_ORIGEN,
  type ServicioAgencia,
  type VistaAgencia,
  type VistaParametro,
} from '../api/agenciasAdmin';
import { mensajeDeError } from '../api/http';
import { useCatalogo } from '../api/useCatalogo';
import { Boton } from '../componentes/Boton';
import { Aviso, Campo } from '../componentes/Campo';
import { Opciones } from '../componentes/Opciones';
import { useSesion } from '../sesion';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

/**
 * RF-17 en el teléfono: las mismas acciones de la web. El directivo ajusta su agencia; el
 * superadministrador elige cualquiera, la abre o la cierra y cambia los parámetros globales.
 */
export function Agencia() {
  const { usuario } = useSesion();
  const roles = usuario?.roles ?? [];
  const superadmin = roles.some((r) => r.rol === 'SUPERADMIN');
  const propias = roles.filter((r) => r.rol === 'ADMIN_AGENCIA').map((r) => r.agenciaId!);
  const { agencias } = useCatalogo();
  const opciones = superadmin ? agencias : agencias.filter((a) => propias.includes(a.id));

  const [agenciaId, setAgenciaId] = useState(propias[0] ?? '');
  const [vista, setVista] = useState<VistaAgencia | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!agenciaId && opciones.length > 0) setAgenciaId(opciones[0].id);
  }, [agenciaId, opciones]);

  useEffect(() => {
    if (!agenciaId) return;
    let vigente = true;
    agenciasAdminApi
      .obtener(agenciaId)
      .then((v) => vigente && setVista(v))
      .catch((err: unknown) => vigente && setMensaje({ tipo: 'error', texto: mensajeDeError(err) }));
    return () => {
      vigente = false;
    };
  }, [agenciaId, recarga]);

  const ejecutar = useCallback(async (operacion: () => Promise<VistaAgencia | null>, exito: string) => {
    setMensaje(null);
    try {
      const v = await operacion();
      if (v) setVista(v);
      setMensaje({ tipo: 'exito', texto: exito });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) });
    }
  }, []);

  /** Cierre o reapertura de la jornada: vuelve a pedir la vista para mostrar el estado del día. */
  async function accionJornada(operacion: () => Promise<string>) {
    setMensaje(null);
    try {
      const texto = await operacion();
      setRecarga((n) => n + 1);
      setMensaje({ tipo: 'exito', texto });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) });
    }
  }

  /** RN-13: cierra la jornada antes de la hora; cancela los turnos en espera y avisa a cada asociado. */
  function cerrarJornada(v: VistaAgencia) {
    Alert.alert('Cerrar la jornada', `Hoy ${v.nombre} no recibirá más turnos; los que están en espera se cancelan y cada asociado recibe el aviso.`, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cerrar la jornada',
        style: 'destructive',
        onPress: () =>
          void accionJornada(async () => {
            const r = await agenciasAdminApi.cerrarJornada(v.id);
            return r ? resumenCierre(r) : 'Jornada cerrada.';
          }),
      },
    ]);
  }

  /** Deshace un cierre anticipado; los turnos ya cancelados no vuelven. */
  function reabrirJornada(v: VistaAgencia) {
    void accionJornada(async () => {
      await agenciasAdminApi.reabrirJornada(v.id);
      return 'Jornada reabierta: la agencia vuelve a recibir turnos en su horario.';
    });
  }

  return (
    <View>
      <Text style={estilos.titulo}>{superadmin ? 'Agencias' : 'Mi agencia'}</Text>
      {opciones.length > 1 && <Opciones titulo="Agencia" opciones={opciones} valor={agenciaId} onCambio={setAgenciaId} />}
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      {vista && (
        <>
          <Text style={estilos.subtitulo}>
            {vista.nombre} · {!vista.activa ? 'cerrada' : vista.jornadaCerrada ? 'jornada cerrada' : 'atendiendo'}
          </Text>
          {vista.activa && (
            <Text style={estilos.nota}>
              {vista.jornadaCerrada
                ? 'Hoy ya no recibe turnos. Si la cerraste por error, reábrela: los turnos cancelados no vuelven.'
                : 'La jornada se cierra sola a la hora de cierre. Ciérrala antes si la agencia deja de atender hoy.'}
            </Text>
          )}
          {vista.jornadaCerrada ? (
            vista.activa && <Boton titulo="Reabrir la jornada" variante="secundario" onPress={() => reabrirJornada(vista)} />
          ) : (
            <Boton titulo="Cerrar la jornada" variante="peligro" onPress={() => cerrarJornada(vista)} />
          )}
          {superadmin && (
            <Boton
              titulo={vista.activa ? 'Cerrar agencia' : 'Abrir agencia'}
              variante={vista.activa ? 'peligro' : 'secundario'}
              onPress={() => {
                const cambiar = () =>
                  void ejecutar(
                    () => agenciasAdminApi.actualizarAgencia(vista.id, !vista.activa),
                    vista.activa ? 'Agencia cerrada: ya no recibe turnos y los de hoy en espera se cancelaron.' : 'Agencia abierta.',
                  );
                if (!vista.activa) return cambiar();
                Alert.alert('Cerrar agencia', `${vista.nombre} deja de recibir turnos y los que están en espera hoy se cancelan.`, [
                  { text: 'Volver', style: 'cancel' },
                  { text: 'Cerrar agencia', style: 'destructive', onPress: cambiar },
                ]);
              }}
            />
          )}

          <Text style={estilos.seccion}>Servicios y ventanillas</Text>
          {vista.servicios.map((s) => (
            <Servicio
              key={s.servicioId}
              servicio={s}
              alCambiar={(cambios, exito) => ejecutar(() => agenciasAdminApi.actualizarServicio(vista.id, s.servicioId, cambios), exito)}
            />
          ))}

          <Text style={estilos.seccion}>Horario y reglas</Text>
          {vista.parametros.map((p) => (
            <Parametro
              key={p.clave}
              parametro={p}
              editable={p.editableEnAgencia}
              alGuardar={(valor) => ejecutar(() => agenciasAdminApi.fijarParametro(vista.id, p.clave, valor), `${p.nombre}: ${valor}.`)}
              alRestablecer={() => ejecutar(() => agenciasAdminApi.restablecerParametro(vista.id, p.clave), `${p.nombre} vuelve al valor global.`)}
            />
          ))}
        </>
      )}
      {superadmin && <Globales />}
    </View>
  );
}

function Servicio({ servicio: s, alCambiar }: { servicio: ServicioAgencia; alCambiar: (c: { ventanillas?: number; activo?: boolean }, exito: string) => Promise<void> }) {
  const cambiarVentanillas = (n: number) => void alCambiar({ ventanillas: n }, `${s.nombre}: ${n} ${n === 1 ? 'ventanilla' : 'ventanillas'}.`);
  return (
    <View style={estilos.tarjeta}>
      <View style={estilos.fila}>
        <Text style={estilos.nombre}>{s.nombre}</Text>
        <View style={estilos.fila}>
          <Text style={estilos.nota}>Se ofrece</Text>
          <Switch
            value={s.activo}
            accessibilityLabel={`Ofrecer ${s.nombre}`}
            onValueChange={(activo) => void alCambiar({ activo }, activo ? `${s.nombre} vuelve a ofrecerse.` : `${s.nombre} ya no se ofrece.`)}
          />
        </View>
      </View>
      <View style={[estilos.fila, { justifyContent: 'flex-start', gap: espacio[3] }]}>
        <Paso texto="−" etiqueta={`Quitar una ventanilla de ${s.nombre}`} deshabilitado={s.ventanillas <= 1} onPress={() => cambiarVentanillas(s.ventanillas - 1)} />
        <Text style={estilos.valor} accessibilityLabel={`${s.ventanillas} ventanillas`}>
          {s.ventanillas}
        </Text>
        <Paso texto="+" etiqueta={`Agregar una ventanilla a ${s.nombre}`} deshabilitado={s.ventanillas >= 20} onPress={() => cambiarVentanillas(s.ventanillas + 1)} />
        <Text style={estilos.nota}>{s.ventanillas === 1 ? 'ventanilla' : 'ventanillas'}</Text>
      </View>
    </View>
  );
}

function Paso({ texto: signo, etiqueta, deshabilitado, onPress }: { texto: string; etiqueta: string; deshabilitado: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={etiqueta} disabled={deshabilitado} onPress={onPress} style={[estilos.paso, deshabilitado && { opacity: 0.4 }]}>
      <Text style={estilos.signo}>{signo}</Text>
    </Pressable>
  );
}

function Parametro({
  parametro: p,
  editable,
  alGuardar,
  alRestablecer,
}: {
  parametro: VistaParametro;
  editable: boolean;
  alGuardar: (valor: string) => Promise<void>;
  alRestablecer?: () => Promise<void>;
}) {
  const [valor, setValor] = useState(p.valor);
  useEffect(() => setValor(p.valor), [p.valor]);
  const error = valor !== p.valor ? errorDeValor(p, valor) : null;
  return (
    <View style={estilos.tarjeta}>
      <Campo
        etiqueta={`${p.nombre}${p.unidad ? ` (${p.unidad})` : ''}`}
        value={valor}
        onChangeText={setValor}
        editable={editable}
        keyboardType={p.tipo === 'entero' ? 'number-pad' : 'numbers-and-punctuation'}
        error={error}
        ayuda={editable ? `${p.descripcion}. ${TEXTO_ORIGEN[p.origen]}.` : 'Lo define el superadministrador para todas las agencias.'}
      />
      {editable && (
        <View style={[estilos.fila, { justifyContent: 'flex-start', gap: espacio[3] }]}>
          <Boton titulo="Guardar" variante="secundario" deshabilitado={valor === p.valor || Boolean(error)} onPress={() => void alGuardar(valor)} />
          {alRestablecer && p.origen === 'AGENCIA' && <Boton titulo="Usar el global" variante="secundario" onPress={() => void alRestablecer()} />}
        </View>
      )}
    </View>
  );
}

function Globales() {
  const [parametros, setParametros] = useState<VistaParametro[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  useEffect(() => {
    agenciasAdminApi
      .parametrosGlobales()
      .then((p) => setParametros(p ?? []))
      .catch((err: unknown) => setMensaje({ tipo: 'error', texto: mensajeDeError(err) }));
  }, []);
  return (
    <View>
      <Text style={estilos.seccion}>Parámetros globales</Text>
      <Text style={estilos.nota}>Aplican a las agencias que no tienen un valor propio.</Text>
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      {parametros.map((p) => (
        <Parametro
          key={p.clave}
          parametro={p}
          editable
          alGuardar={async (valor) => {
            try {
              const nuevos = await agenciasAdminApi.fijarParametroGlobal(p.clave, valor);
              if (nuevos) setParametros(nuevos);
              setMensaje({ tipo: 'exito', texto: `${p.nombre} global: ${valor}.` });
            } catch (err) {
              setMensaje({ tipo: 'error', texto: mensajeDeError(err) });
            }
          }}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto },
  subtitulo: { fontSize: texto.md, color: colores.textoSecundario, marginTop: espacio[3] },
  seccion: { fontSize: texto.lg, fontWeight: '600', color: colores.texto, marginTop: espacio[5] },
  tarjeta: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.borde, borderRadius: radio, padding: espacio[3], marginTop: espacio[2] },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontSize: texto.md, fontWeight: '600', color: colores.texto },
  nota: { fontSize: texto.sm, color: colores.textoSecundario },
  valor: { fontSize: texto.xl, fontWeight: '600', color: colores.texto, minWidth: 32, textAlign: 'center' },
  paso: {
    width: objetivoTactil,
    height: objetivoTactil,
    borderRadius: radio,
    borderWidth: 1,
    borderColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signo: { fontSize: texto.xl, color: colores.primario, fontWeight: '600' },
});
