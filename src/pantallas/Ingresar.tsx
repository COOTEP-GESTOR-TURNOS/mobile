import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { authApi, type Paso, type ResultadoIngreso } from '../api/auth';
import { ErrorApi, mensajeDeError } from '../api/http';
import { Boton } from '../componentes/Boton';
import { Aviso, Campo } from '../componentes/Campo';
import { API_URL } from '../config';
import { useSesion } from '../sesion';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

/** Esquema de app.json: el backend vuelve aquí después de Google. */
const RETORNO = 'cootepturno://oidc';

interface Reto {
  id: string;
  paso: Paso;
}

/** CU-01 en el teléfono: correo y contraseña o Google; luego, si aplica, cambio de clave y MFA. */
export function Ingresar({ irA }: { irA: (pantalla: 'registro' | 'recuperar') => void }) {
  const { abrirSesion } = useSesion();
  const [reto, setReto] = useState<Reto | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function continuar(resultado: ResultadoIngreso | null) {
    if (!resultado) return;
    if (resultado.estado === 'SESION_INICIADA') await abrirSesion(resultado);
    else setReto({ id: resultado.reto, paso: resultado.paso });
  }

  /** Abre Google en una pestaña del navegador del sistema y espera el enlace profundo de regreso. */
  async function conGoogle() {
    setError(null);
    const resultado = await WebBrowser.openAuthSessionAsync(`${API_URL}/api/v1/auth/oidc/google/inicio?cliente=movil`, RETORNO);
    if (resultado.type !== 'success') return;
    const parametros = new URL(resultado.url).searchParams;
    const codigo = parametros.get('codigo');
    const idReto = parametros.get('reto');
    try {
      if (codigo) {
        const sesion = await authApi.canjear(codigo);
        if (sesion) await abrirSesion(sesion);
      } else if (idReto) {
        setReto({ id: idReto, paso: parametros.get('paso') as Paso });
      } else {
        setError('No se pudo iniciar sesión con Google.');
      }
    } catch (err) {
      setError(mensajeDeError(err));
    }
  }

  if (reto) return <PasoPendiente reto={reto} alTerminar={continuar} alCancelar={() => setReto(null)} />;
  return <Credenciales alIngresar={continuar} conGoogle={() => void conGoogle()} errorExterno={error} irA={irA} />;
}

function Credenciales({
  alIngresar,
  conGoogle,
  errorExterno,
  irA,
}: {
  alIngresar: (r: ResultadoIngreso | null) => Promise<void>;
  conGoogle: () => void;
  errorExterno: string | null;
  irA: (pantalla: 'registro' | 'recuperar') => void;
}) {
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sinVerificar, setSinVerificar] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function ingresar() {
    setError(null);
    setAviso(null);
    setCargando(true);
    try {
      await alIngresar(await authApi.login(correo, clave));
    } catch (err) {
      setSinVerificar(err instanceof ErrorApi && err.codigo === 'CORREO_NO_VERIFICADO');
      setError(mensajeDeError(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <View>
      <Text style={estilos.titulo}>Ingresar</Text>
      <Campo etiqueta="Correo" value={correo} onChangeText={setCorreo} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      <Campo etiqueta="Contraseña" value={clave} onChangeText={setClave} clave autoComplete="password" />
      {(error ?? errorExterno) && <Aviso>{(error ?? errorExterno)!}</Aviso>}
      {sinVerificar && (
        <Boton
          titulo="Enviar de nuevo el enlace de confirmación"
          variante="secundario"
          onPress={() =>
            void authApi.reenviarVerificacion(correo).then((r) => {
              setSinVerificar(false);
              setError(null);
              setAviso(r?.mensaje ?? 'Revisa tu correo.');
            })
          }
        />
      )}
      {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      <Boton titulo="Ingresar" onPress={() => void ingresar()} cargando={cargando} />
      <Boton titulo="Continuar con Google" variante="secundario" onPress={conGoogle} />
      <Enlace texto="¿Olvidaste tu contraseña?" onPress={() => irA('recuperar')} />
      <Enlace texto="Soy asociado y quiero crear mi cuenta" onPress={() => irA('registro')} />
    </View>
  );
}

/** Pasos que pide el backend antes de abrir la sesión: clave temporal y MFA (RF-03). */
function PasoPendiente({ reto, alTerminar, alCancelar }: { reto: Reto; alTerminar: (r: ResultadoIngreso | null) => Promise<void>; alCancelar: () => void }) {
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [mfa, setMfa] = useState<{ secreto: string; qr: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setError(null);
    setCodigo('');
    if (reto.paso === 'CONFIGURAR_MFA') {
      authApi.configurarMfa(reto.id).then((r) => r && setMfa(r)).catch((err) => setError(mensajeDeError(err)));
    }
  }, [reto]);

  async function enviar() {
    setError(null);
    setCargando(true);
    try {
      await alTerminar(reto.paso === 'CAMBIAR_CLAVE' ? await authApi.claveInicial(reto.id, clave) : await authApi.verificarMfa(reto.id, codigo));
    } catch (err) {
      setError(mensajeDeError(err));
      if (err instanceof ErrorApi && (err.codigo === 'RETO_VENCIDO' || err.status === 429)) setTimeout(alCancelar, 2500);
    } finally {
      setCargando(false);
    }
  }

  return (
    <View>
      {reto.paso === 'CAMBIAR_CLAVE' && (
        <>
          <Text style={estilos.titulo}>Cambia tu contraseña temporal</Text>
          <Campo etiqueta="Contraseña nueva" value={clave} onChangeText={setClave} clave ayuda="Mínimo 8 caracteres. Puedes usar una frase." />
        </>
      )}
      {reto.paso !== 'CAMBIAR_CLAVE' && (
        <>
          <Text style={estilos.titulo}>Verificación en dos pasos</Text>
          {reto.paso === 'CONFIGURAR_MFA' && (
            <>
              <Text style={estilos.parrafo}>
                Tu rol administra datos de la cooperativa. En la app autenticadora (Google Authenticator u otra) agrega esta clave:
              </Text>
              {mfa ? (
                <>
                  <Text selectable style={estilos.secreto}>
                    {mfa.secreto}
                  </Text>
                  <Image source={{ uri: mfa.qr }} style={estilos.qr} accessibilityLabel="Código QR para escanear desde otro dispositivo" />
                </>
              ) : (
                <Text style={estilos.parrafo}>Generando la clave…</Text>
              )}
            </>
          )}
          <Campo etiqueta="Código de 6 dígitos" value={codigo} onChangeText={(t) => setCodigo(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
        </>
      )}
      {error && <Aviso>{error}</Aviso>}
      <Boton titulo={reto.paso === 'CAMBIAR_CLAVE' ? 'Guardar y continuar' : 'Verificar'} onPress={() => void enviar()} cargando={cargando} />
      <Boton titulo="Cancelar" variante="secundario" onPress={alCancelar} />
    </View>
  );
}

export function Enlace({ texto: contenido, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={estilos.enlace}>
      <Text style={estilos.textoEnlace}>{contenido}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: texto.xl, fontWeight: '600', color: colores.texto, marginBottom: espacio[2] },
  parrafo: { fontSize: texto.md, color: colores.texto, marginTop: espacio[2] },
  etiqueta: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[3] },
  secreto: {
    fontFamily: 'monospace',
    fontSize: texto.md,
    backgroundColor: colores.superficie,
    borderRadius: radio,
    padding: espacio[3],
    marginTop: espacio[3],
    color: colores.texto,
  },
  qr: { width: 200, height: 200, alignSelf: 'center', marginTop: espacio[3] },
  enlace: { minHeight: objetivoTactil, justifyContent: 'center', alignItems: 'center' },
  textoEnlace: { color: colores.primario, fontSize: texto.md, textDecorationLine: 'underline' },
});
