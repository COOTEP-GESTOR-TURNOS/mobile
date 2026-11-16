import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Opciones } from './src/componentes/Opciones';
import { Administracion } from './src/pantallas/Administracion';
import { Asociado } from './src/pantallas/Asociado';
import { Funcionario } from './src/pantallas/Funcionario';
import { Ingresar } from './src/pantallas/Ingresar';
import { Recuperar, Registro } from './src/pantallas/Registro';
import { ProveedorSesion, useSesion } from './src/sesion';
import { colores, espacio, objetivoTactil, texto } from './src/tema/tokens';

// Cierra la pestaña del navegador cuando Google devuelve el control a la app.
WebBrowser.maybeCompleteAuthSession();

type Seccion = 'administracion' | 'atencion' | 'turno';

/** Sin sesión: ingresar, registrarse o recuperar la contraseña. */
function Acceso() {
  const [pantalla, setPantalla] = useState<'ingresar' | 'registro' | 'recuperar'>('ingresar');
  if (pantalla === 'registro') return <Registro volver={() => setPantalla('ingresar')} />;
  if (pantalla === 'recuperar') return <Recuperar volver={() => setPantalla('ingresar')} />;
  return <Ingresar irA={setPantalla} />;
}

/** Cada rol ve sus secciones; el backend vuelve a verificar los permisos en cada API. */
function PantallaPorRol() {
  const { usuario, cargando, cerrarSesion } = useSesion();
  const [elegida, setElegida] = useState<Seccion | null>(null);
  if (cargando) return <ActivityIndicator color={colores.primario} style={{ marginTop: espacio[7] }} />;
  if (!usuario) return <Acceso />;

  const roles = usuario.roles.map((r) => r.rol);
  const secciones: { id: Seccion; nombre: string }[] = [
    ...(roles.includes('SUPERADMIN') || roles.includes('ADMIN_AGENCIA') ? [{ id: 'administracion' as const, nombre: 'Administración' }] : []),
    ...(roles.includes('FUNCIONARIO') || roles.includes('ADMIN_AGENCIA') ? [{ id: 'atencion' as const, nombre: 'Atención' }] : []),
    ...(roles.includes('ASOCIADO') ? [{ id: 'turno' as const, nombre: 'Mi turno' }] : []),
  ];
  const actual = elegida && secciones.some((s) => s.id === elegida) ? elegida : secciones[0]?.id;

  return (
    <View>
      <Text style={estilos.saludo}>Hola, {usuario.nombre}</Text>
      {secciones.length > 1 && <Opciones titulo="Sección" opciones={secciones} valor={actual} onCambio={setElegida} />}
      <View style={{ marginTop: espacio[4] }}>
        {actual === 'administracion' && <Administracion />}
        {actual === 'atencion' && <Funcionario />}
        {actual === 'turno' && <Asociado />}
        {!actual && <Text>Tu rol no tiene una pantalla en la app.</Text>}
      </View>
      <Pressable accessibilityRole="button" onPress={() => void cerrarSesion()} style={estilos.salir}>
        <Text style={estilos.textoSalir}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  return (
    <ProveedorSesion>
      <View style={estilos.encabezado}>
        <Text style={estilos.marca} accessibilityRole="header">
          COOTEP Turno
        </Text>
      </View>
      <ScrollView style={estilos.fondo} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <PantallaPorRol />
      </ScrollView>
      <StatusBar style="light" />
    </ProveedorSesion>
  );
}

const estilos = StyleSheet.create({
  encabezado: { backgroundColor: colores.primario, paddingTop: espacio[7], paddingBottom: espacio[4], paddingHorizontal: espacio[5] },
  marca: { color: '#FFFFFF', fontSize: texto.lg, fontWeight: '600' },
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio[5] },
  saludo: { fontSize: texto.md, color: colores.textoSecundario },
  salir: { minHeight: objetivoTactil, justifyContent: 'center', alignItems: 'center', marginTop: espacio[6] },
  textoSalir: { color: colores.primario, fontSize: texto.md, fontWeight: '600' },
});
