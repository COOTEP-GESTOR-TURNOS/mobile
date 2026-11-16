import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { administracionApi, type FichaUsuario, NOMBRE_ROL, puedeAsignarRol } from '../api/administracion';
import type { AgenciaCatalogo } from '../api/catalogo';
import { mensajeDeError } from '../api/http';
import { useCatalogo } from '../api/useCatalogo';
import { Boton } from '../componentes/Boton';
import { Aviso, Campo } from '../componentes/Campo';
import { Opciones } from '../componentes/Opciones';
import { type AsignacionRol, type Rol, useSesion } from '../sesion';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

const TODOS: Rol[] = ['SUPERADMIN', 'ADMIN_AGENCIA', 'FUNCIONARIO', 'ASOCIADO'];

/**
 * CU-05 y CU-06 en el teléfono: las mismas operaciones del panel web (buscar, crear con su rol,
 * asignar y quitar roles, activar y desactivar). El backend aplica el ámbito de cada administrador.
 */
export function Administracion() {
  const { usuario } = useSesion();
  const roles = usuario?.roles ?? [];
  const superadmin = roles.some((r) => r.rol === 'SUPERADMIN');
  const propias = roles.filter((r) => r.rol === 'ADMIN_AGENCIA').map((r) => r.agenciaId!);
  const rolesAsignables = superadmin ? TODOS : (['FUNCIONARIO'] as Rol[]);

  const { agencias, error: errorCatalogo } = useCatalogo();
  const [texto_, setTexto] = useState('');
  const [usuarios, setUsuarios] = useState<FichaUsuario[]>([]);
  const [total, setTotal] = useState(0);
  const [elegido, setElegido] = useState<FichaUsuario | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agenciasPermitidas = superadmin ? agencias : agencias.filter((a) => propias.includes(a.id));
  const nombreAgencia = (id?: string) => agencias.find((a) => a.id === id)?.nombre;
  const describir = (r: AsignacionRol) =>
    [NOMBRE_ROL[r.rol], nombreAgencia(r.agenciaId), agencias.find((a) => a.id === r.agenciaId)?.servicios.find((s) => s.id === r.servicioId)?.nombre]
      .filter(Boolean)
      .join(' · ');

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
        esYo={elegido.id === usuario?.id}
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
      <Text style={estilos.titulo}>{superadmin ? 'Control global' : `Administración · ${propias.map(nombreAgencia).filter(Boolean).join(', ')}`}</Text>
      {(error ?? errorCatalogo) && <Aviso>{(error ?? errorCatalogo)!}</Aviso>}
      <Boton titulo="Nuevo usuario" onPress={() => setCreando(true)} />
      <Campo etiqueta="Buscar por nombre, correo o documento" value={texto_} onChangeText={setTexto} onSubmitEditing={() => void buscar(texto_)} returnKeyType="search" />
      <Boton titulo="Buscar" variante="secundario" onPress={() => void buscar(texto_)} />
      <Text style={estilos.secundario}>{total} usuarios</Text>
      {usuarios.map((u) => (
        <Pressable key={u.id} style={estilos.fila} onPress={() => setElegido(u)} accessibilityRole="button" accessibilityLabel={`${u.nombre}, ${u.roles.map(describir).join(', ')}`}>
          <Text style={estilos.nombre}>
            {u.nombre}
            {!u.activo && <Text style={{ color: colores.error }}> · desactivado</Text>}
          </Text>
          <Text style={estilos.secundario}>{u.email}</Text>
          <Text style={estilos.secundario}>{u.roles.map(describir).join(' | ')}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function SelectorAmbito({ agencias, roles, valor, alCambiar }: { agencias: AgenciaCatalogo[]; roles: Rol[]; valor: AsignacionRol; alCambiar: (v: AsignacionRol) => void }) {
  const agencia = agencias.find((a) => a.id === valor.agenciaId);
  const conAgencia = valor.rol === 'ADMIN_AGENCIA' || valor.rol === 'FUNCIONARIO';
  return (
    <>
      <Opciones
        titulo="Rol"
        opciones={roles.map((r) => ({ id: r, nombre: NOMBRE_ROL[r] }))}
        valor={valor.rol}
        onCambio={(rol) => alCambiar({ rol, ...(rol === 'ADMIN_AGENCIA' || rol === 'FUNCIONARIO' ? { agenciaId: valor.agenciaId ?? agencias[0]?.id } : {}) })}
      />
      {conAgencia && (
        <Opciones titulo="Agencia" opciones={agencias} valor={valor.agenciaId} onCambio={(agenciaId) => alCambiar({ rol: valor.rol, agenciaId })} />
      )}
      {valor.rol === 'FUNCIONARIO' && agencia && (
        <Opciones
          titulo="Servicio"
          opciones={[{ id: '', nombre: 'Todos' }, ...agencia.servicios]}
          valor={valor.servicioId ?? ''}
          onCambio={(servicioId) => alCambiar({ ...valor, servicioId: servicioId || undefined })}
        />
      )}
    </>
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
  const [ambito, setAmbito] = useState<AsignacionRol>(() => inicial(roles, agencias));
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [accion, setAccion] = useState<string | null>(null);

  async function ejecutar(nombre: string, operacion: () => Promise<FichaUsuario | null>, exito: string) {
    setAccion(nombre);
    setMensaje(null);
    try {
      const r = await operacion();
      if (r) alActualizar(r);
      setMensaje({ tipo: 'exito', texto: exito });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setAccion(null);
    }
  }

  return (
    <View>
      <Text style={estilos.titulo}>{ficha.nombre}</Text>
      <Text style={estilos.secundario}>{ficha.email}</Text>
      <Text style={estilos.secundario}>
        {[ficha.activo ? 'Activo' : 'Desactivado', ficha.tienePassword ? 'contraseña definida' : 'activación pendiente', ficha.mfaActivo ? 'MFA activo' : 'sin MFA'].join(' · ')}
      </Text>

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
      <Boton titulo="Asignar rol" variante="secundario" cargando={accion === 'asignar'} onPress={() => void ejecutar('asignar', () => administracionApi.asignarRol(ficha.id, ambito), 'Rol asignado.')} />

      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      {!esYo && (
        <Boton
          titulo={ficha.activo ? 'Desactivar cuenta' : 'Activar cuenta'}
          variante={ficha.activo ? 'peligro' : 'secundario'}
          cargando={accion === 'estado'}
          onPress={() => void ejecutar('estado', () => administracionApi.activar(ficha.id, !ficha.activo), ficha.activo ? 'Cuenta desactivada.' : 'Cuenta activada.')}
        />
      )}
      <Boton titulo="Volver a la lista" variante="secundario" onPress={volver} />
    </View>
  );
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
  rol: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colores.borde, minHeight: objetivoTactil },
  quitar: { minHeight: objetivoTactil, minWidth: objetivoTactil, justifyContent: 'center', alignItems: 'center', paddingHorizontal: espacio[3] },
});
