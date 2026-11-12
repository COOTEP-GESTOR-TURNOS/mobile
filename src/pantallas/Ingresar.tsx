import { useState } from 'react';
import { Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { ErrorApi, pedir } from '../api/http';
import { Boton } from '../componentes/Boton';
import { API_URL } from '../config';
import { useSesion } from '../sesion';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

export function Ingresar() {
  const { iniciarConToken } = useSesion();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [tokenPrueba, setTokenPrueba] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar() {
    setError(null);
    setCargando(true);
    try {
      const respuesta = await pedir<{ tokenAcceso: string }>('POST', '/auth/login', { cuerpo: { correo, clave } });
      if (respuesta) await iniciarConToken(respuesta.tokenAcceso);
    } catch (err) {
      setError(
        err instanceof ErrorApi && err.status === 501
          ? 'El inicio de sesión local todavía no está implementado en el backend.'
          : 'No se pudo conectar con el servidor. Revise EXPO_PUBLIC_API_URL.',
      );
    } finally {
      setCargando(false);
    }
  }

  async function usarTokenPrueba() {
    try {
      await iniciarConToken(tokenPrueba);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <View>
      <Text style={estilos.titulo}>Ingresar</Text>
      <Text style={estilos.etiqueta}>Correo</Text>
      <TextInput
        style={estilos.campo}
        value={correo}
        onChangeText={setCorreo}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel="Correo"
      />
      <Text style={estilos.etiqueta}>Contraseña</Text>
      <TextInput style={estilos.campo} value={clave} onChangeText={setClave} secureTextEntry autoComplete="password" accessibilityLabel="Contraseña" />
      {error && (
        <Text style={estilos.error} accessibilityLiveRegion="assertive">
          {error}
        </Text>
      )}
      <Boton titulo="Ingresar" onPress={() => void ingresar()} cargando={cargando} />
      <Boton titulo="Continuar con Google" variante="secundario" onPress={() => void Linking.openURL(`${API_URL}/api/v1/auth/oidc/google/inicio`)} />
      <Boton titulo="Continuar con Microsoft" variante="secundario" onPress={() => void Linking.openURL(`${API_URL}/api/v1/auth/oidc/microsoft/inicio`)} />

      {__DEV__ && (
        <View style={estilos.desarrollo}>
          <Text style={estilos.etiqueta}>Token de prueba (npm run token:dev en el backend)</Text>
          <TextInput style={[estilos.campo, { minHeight: 96 }]} value={tokenPrueba} onChangeText={setTokenPrueba} multiline autoCapitalize="none" accessibilityLabel="Token de prueba" />
          <Boton titulo="Usar token" variante="secundario" onPress={() => void usarTokenPrueba()} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto, marginBottom: espacio[4] },
  etiqueta: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[3] },
  campo: {
    minHeight: objetivoTactil,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio,
    paddingHorizontal: espacio[3],
    backgroundColor: colores.superficie,
    color: colores.texto,
    fontSize: texto.md,
  },
  error: { color: colores.error, marginTop: espacio[3] },
  desarrollo: { marginTop: espacio[6], borderTopWidth: 1, borderTopColor: colores.borde, paddingTop: espacio[4] },
});
