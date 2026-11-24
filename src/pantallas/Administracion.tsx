import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { administracionApi, type FichaUsuario, NOMBRE_ROL, puedeAsignarRol } from '../api/administracion';
import type { AgenciaCatalogo } from '../api/catalogo';
import { mensajeDeError } from '../api/http';
import { useCatalogo } from '../api/useCatalogo';
import { Boton } from '../componentes/Boton';
import { Aviso, Campo } from '../componentes/Campo';
import { Desplegable } from '../componentes/Desplegable';
import { type AsignacionRol, type Rol, useSesion } from '../sesion';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

const TODOS: Rol[] = ['SUPERADMIN', 'ADMIN_AGENCIA', 'FUNCIONARIO', 'ASOCIADO'];

/** Lo que el administrador puede ver y asignar según sus roles (el backend lo vuelve a validar). */
function useAmbitoAdministracion() {
  const { usuario } = useSesion();
  const { agencias, error: errorCatalogo } = useCatalogo();
  const roles = usuario?.roles ?? [];
  const superadmin = roles.some((r) => r.rol === 'SUPERADMIN');
  const propias = roles.filter((r) => r.rol === 'ADMIN_AGENCIA').map((r) => r.agenciaId!);
  return {
    usuarioId: usuario?.id,
    roles,
    superadmin,
    propias,
    agencias,
    errorCatalogo,
    rolesAsignables: superadmin ? TODOS : (['FUNCIONARIO'] as Rol[]),
    agenciasPermitidas: superadmin ? agencias : agencias.filter((a) => propias.includes(a.id)),
  };
}

function useListaUsuarios() {
  const [usuarios, setUsuarios] = useState<FichaUsuario[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const buscar = useCallback(async (filtro: string) => {
    try {
      const r = await administracionApi.listar(filtro);
      setUsuarios(r?.elementos ?? []);
      setTotal(r?.total ?? 0);
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }, []);

  useEffect(() => {
    void buscar('');
  }, [buscar]);

  return { usuarios, total, error, buscar };
}

function nombreAgencia(agencias: AgenciaCatalogo[], id?: string): string | undefined {
  return agencias.find((a) => a.id === id)?.nombre;
}

function nombreServicio(agencias: AgenciaCatalogo[], agenciaId?: string, servicioId?: string): string | undefined {
  return agencias.find((a) => a.id === agenciaId)?.servicios.find((s) => s.id === servicioId)?.nombre;
}

/** «Funcionario · Agencia Mocoa · Caja»: el rol con su agencia y su servicio, si los tiene. */
function describirAsignacion(agencias: AgenciaCatalogo[], r: AsignacionRol): string {
  return [NOMBRE_ROL[r.rol], nombreAgencia(agencias, r.agenciaId), nombreServicio(agencias, r.agenciaId, r.servicioId)].filter(Boolean).join(' · ');
}

function tituloAdministracion(superadmin: boolean, propias: string[], agencias: AgenciaCatalogo[]): string {
  if (superadmin) return 'Control global';
  return `Administración · ${propias.map((id) => nombreAgencia(agencias, id)).filter(Boolean).join(', ')}`;
}

/**
 * CU-05 y CU-06 en el teléfono: las mismas operaciones del panel web (buscar, crear con su rol,
 * asignar y quitar roles, activar y desactivar). El backend aplica el ámbito de cada administrador.
 */
export function Administracion() {
  const ambitoAdmin = useAmbitoAdministracion();
  const { roles, agencias, agenciasPermitidas, rolesAsignables } = ambitoAdmin;
  const { usuarios, total, error, buscar } = useListaUsuarios();
  const [texto_, setTexto] = useState('');
  const [elegido, setElegido] = useState<FichaUsuario | null>(null);
  const [creando, setCreando] = useState(false);
  const describir = (r: AsignacionRol) => describirAsignacion(agencias, r);
  const errorVisible = error ?? ambitoAdmin.errorCatalogo;

  function actualizado(ficha: FichaUsuario) {
    setElegido(ficha);
    void buscar(texto_);
  }

  if (creando) {
    return (
      <NuevoUsuario
        agencias={agenciasPermitidas}
        roles={rolesAsignables}
        alTerminar={(ficha) => {
          setCreando(false);
          if (ficha) actualizado(ficha);
        }}
      />
    );
  }

  if (elegido) {
    return (
      <Ficha
        ficha={elegido}
        actor={roles}
        esYo={elegido.id === ambitoAdmin.usuarioId}
        agencias={agenciasPermitidas}
        roles={rolesAsignables}
        describir={describir}
        alActualizar={actualizado}
        volver={() => setElegido(null)}
      />
    );
  }

  return (
    <View>
      <Text style={estilos.titulo}>{tituloAdministracion(ambitoAdmin.superadmin, ambitoAdmin.propias, agencias)}</Text>
      {errorVisible && <Aviso>{errorVisible}</Aviso>}
      <Boton titulo="Nuevo usuario" onPress={() => setCreando(true)} />
      <Campo etiqueta="Buscar por nombre, correo o documento" value={texto_} onChangeText={setTexto} onSubmitEditing={() => void buscar(texto_)} returnKeyType="search" />
      <Boton titulo="Buscar" variante="secundario" onPress={() => void buscar(texto_)} />
      <Text style={estilos.secundario}>{total} usuarios</Text>
      {usuarios.map((u) => (
        <FilaUsuario key={u.id} usuario={u} describir={describir} elegir={() => setElegido(u)} />
      ))}
    </View>
  );
}

function FilaUsuario({ usuario: u, describir, elegir }: { usuario: FichaUsuario; describir: (r: AsignacionRol) => string; elegir: () => void }) {
  return (
    <Pressable style={estilos.fila} onPress={elegir} accessibilityRole="button" accessibilityLabel={`${u.nombre}, ${u.roles.map(describir).join(', ')}`}>
      <Text style={estilos.nombre}>
        {u.nombre}
        {!u.activo && <Text style={{ color: colores.error }}> · desactivado</Text>}
      </Text>
      <Text style={estilos.secundario}>{u.email}</Text>
      <Text style={estilos.secundario}>{u.roles.map(describir).join(' | ')}</Text>
    </Pressable>
  );
}

/** El administrador de agencia y el funcionario trabajan en una agencia; los demás roles no. */
function requiereAgencia(rol?: Rol): boolean {
  return rol === 'ADMIN_AGENCIA' || rol === 'FUNCIONARIO';
}

/** Al cambiar de rol se conserva la agencia elegida (o la primera) si el nuevo rol la necesita. */
function asignacionConRol(rol: Rol, valor: AsignacionRol | null, agencias: AgenciaCatalogo[]): AsignacionRol {
  return { rol, ...(requiereAgencia(rol) ? { agenciaId: valor?.agenciaId ?? agencias[0]?.id } : {}) };
}

/** valor null: todavía no se eligió rol (al asignar otro rol a un usuario existente). */
function SelectorAmbito({
  agencias,
  roles,
  valor,
  alCambiar,
}: {
  agencias: AgenciaCatalogo[];
  roles: Rol[];
  valor: AsignacionRol | null;
  alCambiar: (v: AsignacionRol) => void;
}) {
  const agencia = agencias.find((a) => a.id === valor?.agenciaId);
  // Desplegables: cada uno ocupa una línea aunque haya muchas agencias o servicios.
  return (
    <>
      <SelectorRol roles={roles} valor={valor} alCambiar={(rol) => alCambiar(asignacionConRol(rol, valor, agencias))} />
      {valor && requiereAgencia(valor.rol) && <SelectorAgencia agencias={agencias} valor={valor} alCambiar={alCambiar} />}
      {valor?.rol === 'FUNCIONARIO' && agencia && <SelectorServicio agencia={agencia} valor={valor} alCambiar={alCambiar} />}
    </>
  );
}

function SelectorRol({ roles, valor, alCambiar }: { roles: Rol[]; valor: AsignacionRol | null; alCambiar: (rol: Rol) => void }) {
  return (
    <Desplegable
      titulo="Rol"
      marcador="Elige un rol"
      opciones={roles.map((r) => ({ id: r, nombre: NOMBRE_ROL[r] }))}
      valor={valor?.rol}
      onCambio={alCambiar}
    />
  );
}

function SelectorAgencia({ agencias, valor, alCambiar }: { agencias: AgenciaCatalogo[]; valor: AsignacionRol; alCambiar: (v: AsignacionRol) => void }) {
  return (
    <Desplegable
      titulo="Agencia"
      opciones={agencias.map((a) => ({ id: a.id, nombre: a.nombre, detalle: a.activa ? undefined : 'Cerrada' }))}
      valor={valor.agenciaId}
      onCambio={(agenciaId) => alCambiar({ rol: valor.rol, agenciaId })}
    />
  );
}

function SelectorServicio({ agencia, valor, alCambiar }: { agencia: AgenciaCatalogo; valor: AsignacionRol; alCambiar: (v: AsignacionRol) => void }) {
  return (
    <Desplegable
      titulo="Servicio"
      opciones={[
        { id: '', nombre: 'Todos', detalle: 'Atiende cualquier fila de la agencia' },
        ...agencia.servicios.map((s) => ({ id: s.id, nombre: s.nombre, detalle: `${s.ventanillas} ${s.ventanillas === 1 ? 'ventanilla' : 'ventanillas'}` })),
      ]}
      valor={valor.servicioId ?? ''}
      onCambio={(servicioId) => alCambiar({ ...valor, servicioId: servicioId || undefined })}
    />
  );
}

function inicial(roles: Rol[], agencias: AgenciaCatalogo[]): AsignacionRol {
  const rol = roles.includes('ADMIN_AGENCIA') ? 'ADMIN_AGENCIA' : roles[0];
  return { rol, agenciaId: agencias[0]?.id };
}

function NuevoUsuario({ agencias, roles, alTerminar }: { agencias: AgenciaCatalogo[]; roles: Rol[]; alTerminar: (f: FichaUsuario | null) => void }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [ambito, setAmbito] = useState<AsignacionRol>(() => inicial(roles, agencias));
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function crear() {
    setError(null);
    setCargando(true);
    try {
      const r = await administracionApi.crear({ nombre, email, ...ambito });
      if (r) {
        Alert.alert('Usuario creado', r.activacionEnviada ? `Enviamos a ${r.usuario.email} el enlace de activación.` : 'El correo no salió; reenvíalo desde la web.');
        alTerminar(r.usuario);
      }
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <View>
      <Text style={estilos.titulo}>Nuevo usuario</Text>
      <Text style={estilos.secundario}>Recibirá un correo para definir su contraseña.</Text>
      <Campo etiqueta="Nombre completo" value={nombre} onChangeText={setNombre} />
      <Campo etiqueta="Correo" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <SelectorAmbito agencias={agencias} roles={roles} valor={ambito} alCambiar={setAmbito} />
      {error && <Aviso>{error}</Aviso>}
      <Boton titulo="Crear y enviar activación" onPress={() => void crear()} cargando={cargando} />
      <Boton titulo="Cancelar" variante="secundario" onPress={() => alTerminar(null)} />
    </View>
  );
}

function Ficha({
  ficha,
  actor,
  esYo,
  agencias,
  roles,
  describir,
  alActualizar,
  volver,
}: {
  ficha: FichaUsuario;
  actor: AsignacionRol[];
  esYo: boolean;
  agencias: AgenciaCatalogo[];
  roles: Rol[];
  describir: (r: AsignacionRol) => string;
  alActualizar: (f: FichaUsuario) => void;
  volver: () => void;
}) {
  // Sin rol elegido al abrir la ficha: «Asignar rol» solo aparece cuando el administrador elige uno.
  const [ambito, setAmbito] = useState<AsignacionRol | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [accion, setAccion] = useState<string | null>(null);

  /** Devuelve true si la operación terminó bien. */
  async function ejecutar(nombre: string, operacion: () => Promise<FichaUsuario | null>, exito: string): Promise<boolean> {
    setAccion(nombre);
    setMensaje(null);
    try {
      const r = await operacion();
      if (r) alActualizar(r);
      setMensaje({ tipo: 'exito', texto: exito });
      return true;
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) });
      return false;
    } finally {
      setAccion(null);
    }
  }

  async function asignar(elegido: AsignacionRol) {
    if (await ejecutar('asignar', () => administracionApi.asignarRol(ficha.id, elegido), 'Rol asignado.')) setAmbito(null);
  }

  return (
    <View>
      {/* Cerrar arriba: sale de la ficha sin guardar lo que se estaba eligiendo */}
      <View style={estilos.cabeceraFicha}>
        <Text style={[estilos.titulo, { flex: 1 }]}>{ficha.nombre}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Cerrar la ficha de ${ficha.nombre}`}
          onPress={volver}
          style={({ pressed }) => [estilos.cerrarFicha, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="close" size={22} color={colores.textoSecundario} />
          <Text style={estilos.textoCerrar}>Cerrar</Text>
        </Pressable>
      </View>
      <Text style={estilos.secundario}>{ficha.email}</Text>
      <Text style={estilos.secundario}>{estadoCuenta(ficha)}</Text>

      <Text style={estilos.subtitulo}>Roles</Text>
      {ficha.roles.map((r) => (
        <View key={r.id} style={estilos.rol}>
          <Text style={{ flex: 1, color: colores.texto }}>{describir(r)}</Text>
          {puedeAsignarRol(actor, r) && ficha.roles.length > 1 && !(esYo && r.rol === 'SUPERADMIN') && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${describir(r)}`}
              style={estilos.quitar}
              onPress={() => void ejecutar(`quitar-${r.id}`, () => administracionApi.revocarRol(ficha.id, r.id), 'Rol retirado.')}
            >
              <Text style={{ color: colores.error, fontWeight: '600' }}>Quitar</Text>
            </Pressable>
          )}
        </View>
      ))}

      <Text style={estilos.subtitulo}>Asignar otro rol</Text>
      <SelectorAmbito agencias={agencias} roles={roles} valor={ambito} alCambiar={setAmbito} />
      {ambito && (
        <>
          <Boton titulo="Asignar rol" cargando={accion === 'asignar'} onPress={() => void asignar(ambito)} />
          <Boton titulo="Cancelar" variante="secundario" deshabilitado={accion === 'asignar'} onPress={() => setAmbito(null)} />
        </>
      )}

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      {!esYo && (
        <BotonEstadoCuenta
          activo={ficha.activo}
          cargando={accion === 'estado'}
          alPulsar={() => void ejecutar('estado', () => administracionApi.activar(ficha.id, !ficha.activo), ficha.activo ? 'Cuenta desactivada.' : 'Cuenta activada.')}
        />
      )}
      <Boton titulo="Volver a la lista" variante="secundario" onPress={volver} />
    </View>
  );
}

/** «Activo · contraseña definida · sin MFA» */
function estadoCuenta(ficha: FichaUsuario): string {
  return [ficha.activo ? 'Activo' : 'Desactivado', ficha.tienePassword ? 'contraseña definida' : 'activación pendiente', ficha.mfaActivo ? 'MFA activo' : 'sin MFA'].join(' · ');
}

function BotonEstadoCuenta({ activo, cargando, alPulsar }: { activo: boolean; cargando: boolean; alPulsar: () => void }) {
  return <Boton titulo={activo ? 'Desactivar cuenta' : 'Activar cuenta'} variante={activo ? 'peligro' : 'secundario'} cargando={cargando} onPress={alPulsar} />;
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto, marginBottom: espacio[2] },
  subtitulo: { fontSize: texto.lg, fontWeight: '600', color: colores.texto, marginTop: espacio[5] },
  secundario: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[1] },
  nombre: { fontSize: texto.md, fontWeight: '600', color: colores.texto },
  fila: {
    minHeight: objetivoTactil,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio,
    padding: espacio[3],
    marginTop: espacio[2],
  },
  cabeceraFicha: { flexDirection: 'row', alignItems: 'flex-start', gap: espacio[2] },
  cerrarFicha: {
    minHeight: objetivoTactil,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[1],
    paddingHorizontal: espacio[3],
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio,
    backgroundColor: colores.superficie,
  },
  textoCerrar: { color: colores.textoSecundario, fontSize: texto.sm, fontWeight: '600' },
  rol: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colores.borde, minHeight: objetivoTactil },
  quitar: { minHeight: objetivoTactil, minWidth: objetivoTactil, justifyContent: 'center', alignItems: 'center', paddingHorizontal: espacio[3] },
});
