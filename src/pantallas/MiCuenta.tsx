import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { authApi, errorDeFecha, minimoClave, type Perfil, TIPOS_DOCUMENTO, type TipoDocumento } from '../api/auth';
import { mensajeDeError } from '../api/http';
import { Boton } from '../componentes/Boton';
import { Aviso, Campo } from '../componentes/Campo';
import { Opciones } from '../componentes/Opciones';
import { useSesion } from '../sesion';
import { colores, espacio, texto } from '../tema/tokens';

type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null;

/**
 * RF-01 y RF-04 en el teléfono, igual que la página Mi cuenta de la web: quien entró con Google
 * completa su documento, y cualquiera cambia (o crea) su contraseña. Usa PATCH /auth/yo y
 * POST /auth/yo/clave; las reglas las aplica el backend.
 */
export function MiCuenta() {
  const { recargarPerfil } = useSesion();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authApi
      .yo()
      .then((p) => p && setPerfil(p))
      .catch((err: unknown) => setError(mensajeDeError(err)));
  }, []);

  if (!perfil) return error ? <Aviso>{error}</Aviso> : <ActivityIndicator color={colores.primario} accessibilityLabel="Cargando tu cuenta" />;

  return (
    <View>
      <Text style={estilos.titulo}>Mi cuenta</Text>
      <Text style={estilos.nota}>{perfil.email}</Text>
      <Datos
        perfil={perfil}
        alGuardar={async () => {
          // El perfil nuevo trae perfilCompleto calculado por el backend.
          const nuevo = await authApi.yo();
          if (nuevo) setPerfil(nuevo);
          await recargarPerfil();
        }}
      />
      <Clave perfil={perfil} alGuardar={() => setPerfil({ ...perfil, tienePassword: true })} />
    </View>
  );
}

function Datos({ perfil, alGuardar }: { perfil: Perfil; alGuardar: () => Promise<void> }) {
  const [datos, setDatos] = useState({
    nombre: perfil.nombre,
    tipoDocumento: perfil.tipoDocumento ?? ('CC' as TipoDocumento),
    numeroDocumento: perfil.numeroDocumento ?? '',
    fechaNacimiento: perfil.fechaNacimiento ?? '',
  });
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [cargando, setCargando] = useState(false);
  const errorFecha = errorDeFecha(datos.fechaNacimiento);
  const sinDocumento = !perfil.perfilCompleto && datos.numeroDocumento.trim() === '';

  async function guardar() {
    setMensaje(null);
    if (sinDocumento) {
      setMensaje({ tipo: 'error', texto: 'Escribe tu número de documento.' });
      return;
    }
    setCargando(true);
    try {
      const numero = datos.numeroDocumento.trim();
      await authApi.actualizarPerfil({
        nombre: datos.nombre.trim(),
        ...(numero ? { tipoDocumento: datos.tipoDocumento, numeroDocumento: numero } : {}),
        ...(datos.fechaNacimiento ? { fechaNacimiento: datos.fechaNacimiento } : {}),
      });
      await alGuardar();
      setMensaje({ tipo: 'exito', texto: 'Datos guardados.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setCargando(false);
    }
  }

  return (
    <View>
      <Text style={estilos.seccion}>Tus datos</Text>
      {!perfil.perfilCompleto && <Aviso tipo="info">Completa tu documento para que tu agencia pueda identificarte.</Aviso>}
      <Campo etiqueta="Nombre completo" value={datos.nombre} onChangeText={(nombre) => setDatos({ ...datos, nombre })} autoComplete="name" />
      <Opciones titulo="Tipo de documento" opciones={TIPOS_DOCUMENTO} valor={datos.tipoDocumento} onCambio={(tipoDocumento) => setDatos({ ...datos, tipoDocumento })} />
      <Campo
        etiqueta="Número de documento"
        value={datos.numeroDocumento}
        onChangeText={(numeroDocumento) => setDatos({ ...datos, numeroDocumento })}
        // El pasaporte y la cédula de extranjería pueden llevar letras.
        keyboardType={datos.tipoDocumento === 'CC' || datos.tipoDocumento === 'TI' ? 'number-pad' : 'default'}
        autoCapitalize="characters"
      />
      <Campo
        etiqueta="Fecha de nacimiento (opcional)"
        value={datos.fechaNacimiento}
        onChangeText={(fechaNacimiento) => setDatos({ ...datos, fechaNacimiento: fechaNacimiento.trim() })}
        placeholder="1985-04-23"
        keyboardType="numbers-and-punctuation"
        error={errorFecha}
        ayuda="Año-mes-día. Desde los 60 años la atención es preferencial sin pedirla."
      />
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      <Boton titulo="Guardar datos" cargando={cargando} deshabilitado={Boolean(errorFecha) || datos.nombre.trim().length < 2} onPress={() => void guardar()} />
    </View>
  );
}

function Clave({ perfil, alGuardar }: { perfil: Perfil; alGuardar: () => void }) {
  const [claves, setClaves] = useState({ actual: '', nueva: '', confirmacion: '' });
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [cargando, setCargando] = useState(false);
  const minimo = minimoClave(perfil.roles);

  async function guardar() {
    setMensaje(null);
    if (claves.nueva.length < minimo) {
      setMensaje({ tipo: 'error', texto: `La contraseña nueva debe tener al menos ${minimo} caracteres.` });
      return;
    }
    if (claves.nueva !== claves.confirmacion) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
      return;
    }
    setCargando(true);
    try {
      await authApi.cambiarClave(claves.nueva, perfil.tienePassword ? claves.actual : undefined);
      setClaves({ actual: '', nueva: '', confirmacion: '' });
      alGuardar();
      setMensaje({ tipo: 'exito', texto: perfil.tienePassword ? 'Contraseña actualizada.' : 'Contraseña creada: ya puedes entrar también con tu correo.' });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setCargando(false);
    }
  }

  return (
    <View>
      <Text style={estilos.seccion}>{perfil.tienePassword ? 'Cambiar contraseña' : 'Crear una contraseña'}</Text>
      {!perfil.tienePassword && <Text style={estilos.nota}>Entras con Google. Si creas una contraseña, también podrás entrar con tu correo.</Text>}
      {perfil.tienePassword && (
        <Campo etiqueta="Contraseña actual" value={claves.actual} onChangeText={(actual) => setClaves({ ...claves, actual })} clave autoComplete="current-password" />
      )}
      <Campo
        etiqueta="Contraseña nueva"
        value={claves.nueva}
        onChangeText={(nueva) => setClaves({ ...claves, nueva })}
        clave
        autoComplete="new-password"
        ayuda={`Mínimo ${minimo} caracteres. Una frase fácil de recordar es más segura.`}
      />
      <Campo
        etiqueta="Repite la contraseña"
        value={claves.confirmacion}
        onChangeText={(confirmacion) => setClaves({ ...claves, confirmacion })}
        clave
        autoComplete="new-password"
      />
      {mensaje && <Aviso tipo={mensaje.tipo}>{mensaje.texto}</Aviso>}
      <Boton
        titulo="Guardar contraseña"
        cargando={cargando}
        deshabilitado={!claves.nueva || (perfil.tienePassword && !claves.actual)}
        onPress={() => void guardar()}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto },
  seccion: { fontSize: texto.lg, fontWeight: '600', color: colores.texto, marginTop: espacio[5] },
  nota: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[1] },
});
