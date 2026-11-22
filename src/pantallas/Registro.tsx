import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { authApi, TIPOS_DOCUMENTO, type TipoDocumento } from '../api/auth';
import { mensajeDeError } from '../api/http';
import { Boton } from '../componentes/Boton';
import { Aviso, Campo } from '../componentes/Campo';
import { Opciones } from '../componentes/Opciones';
import { colores, espacio, texto } from '../tema/tokens';
import { Enlace } from './Ingresar';

/** Registro público de asociados (igual que en la web). */
export function Registro({ volver }: { volver: () => void }) {
  const [datos, setDatos] = useState({ nombre: '', email: '', tipoDocumento: 'CC' as TipoDocumento, numeroDocumento: '', clave: '' });
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function registrar() {
    setError(null);
    if (datos.clave !== confirmacion) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setCargando(true);
    try {
      const r = await authApi.registro(datos);
      setEnviado(r?.email ?? datos.email);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <View>
        <Text style={estilos.titulo}>Revisa tu correo</Text>
        <Aviso tipo="exito">{`Enviamos un enlace a ${enviado}. Ábrelo para confirmar tu correo y luego ingresa.`}</Aviso>
        <Boton titulo="Ir a ingresar" onPress={volver} />
      </View>
    );
  }

  return (
    <View>
      <Text style={estilos.titulo}>Crear cuenta de asociado</Text>
      <Campo etiqueta="Nombre completo" value={datos.nombre} onChangeText={(nombre) => setDatos({ ...datos, nombre })} autoComplete="name" />
      <Campo etiqueta="Correo" value={datos.email} onChangeText={(email) => setDatos({ ...datos, email })} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Opciones titulo="Tipo de documento" opciones={TIPOS_DOCUMENTO} valor={datos.tipoDocumento} onCambio={(tipoDocumento) => setDatos({ ...datos, tipoDocumento })} />
      <Campo etiqueta="Número de documento" value={datos.numeroDocumento} onChangeText={(numeroDocumento) => setDatos({ ...datos, numeroDocumento })} keyboardType="number-pad" />
      <Campo
        etiqueta="Contraseña"
        value={datos.clave}
        onChangeText={(clave) => setDatos({ ...datos, clave })}
        clave
        ayuda="Mínimo 15 caracteres. Una frase fácil de recordar es más segura."
      />
      <Campo etiqueta="Repite la contraseña" value={confirmacion} onChangeText={setConfirmacion} clave />
      {error && <Aviso>{error}</Aviso>}
      <Boton titulo="Crear cuenta" onPress={() => void registrar()} cargando={cargando} />
      <Enlace texto="Ya tengo cuenta" onPress={volver} />
    </View>
  );
}

/** RF-04: pide el enlace; la contraseña nueva se elige desde el correo (abre la web). */
export function Recuperar({ volver }: { volver: () => void }) {
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    setError(null);
    setCargando(true);
    try {
      const r = await authApi.recuperar(correo);
      setMensaje(`${r?.mensaje ?? 'Revisa tu correo.'} El enlace vence en 15 minutos.`);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <View>
      <Text style={estilos.titulo}>Recuperar contraseña</Text>
      {mensaje ? (
        <Aviso tipo="exito">{mensaje}</Aviso>
      ) : (
        <>
          <Text style={estilos.parrafo}>Te enviaremos un enlace para elegir una contraseña nueva.</Text>
          <Campo etiqueta="Correo" value={correo} onChangeText={setCorreo} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          {error && <Aviso>{error}</Aviso>}
          <Boton titulo="Enviar enlace" onPress={() => void enviar()} cargando={cargando} />
        </>
      )}
      <Enlace texto="Volver a ingresar" onPress={volver} />
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto, marginBottom: espacio[2] },
  parrafo: { fontSize: texto.md, color: colores.texto },
});
