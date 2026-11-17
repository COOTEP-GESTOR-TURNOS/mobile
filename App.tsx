import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Aviso } from './src/componentes/Campo';
import { Opciones } from './src/componentes/Opciones';
import { Administracion } from './src/pantallas/Administracion';
import { Agencia } from './src/pantallas/Agencia';
import { Auditoria } from './src/pantallas/Auditoria';
import { Asociado } from './src/pantallas/Asociado';
import { Funcionario } from './src/pantallas/Funcionario';
import { Indicadores } from './src/pantallas/Indicadores';
import { Ingresar } from './src/pantallas/Ingresar';
import { MiCuenta } from './src/pantallas/MiCuenta';
import { Recuperar, Registro } from './src/pantallas/Registro';
import { ProveedorSesion, useSesion } from './src/sesion';
import { colores, espacio, objetivoTactil, texto } from './src/tema/tokens';

// Cierra la pestaña del navegador cuando Google devuelve el control a la app.
WebBrowser.maybeCompleteAuthSession();

type Seccion = 'administracion' | 'agencia' | 'indicadores' | 'auditoria' | 'atencion' | 'turno' | 'cuenta';

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
  const incompleto = usuario !== null && !usuario.perfilCompleto;
  // Fija Mi cuenta mientras se completa: al guardar el documento la persona sigue viendo el resultado.
  useEffect(() => {
    if (incompleto) setElegida((e) => e ?? 'cuenta');
  }, [incompleto]);
  if (cargando) return <ActivityIndicator color={colores.primario} style={{ marginTop: espacio[7] }} />;
  if (!usuario) return <Acceso />;

  const roles = usuario.roles.map((r) => r.rol);
  const secciones: { id: Seccion; nombre: string }[] = [
    ...(roles.includes('SUPERADMIN') || roles.includes('ADMIN_AGENCIA')
      ? [
          { id: 'administracion' as const, nombre: 'Usuarios' },
          { id: 'agencia' as const, nombre: roles.includes('SUPERADMIN') ? 'Agencias' : 'Mi agencia' },
          { id: 'indicadores' as const, nombre: 'Indicadores' },
        ]
      : []),
    ...(roles.includes('SUPERADMIN') ? [{ id: 'auditoria' as const, nombre: 'Auditoría' }] : []),
    ...(roles.includes('FUNCIONARIO') || roles.includes('ADMIN_AGENCIA') ? [{ id: 'atencion' as const, nombre: 'Atención' }] : []),
    ...(roles.includes('ASOCIADO') ? [{ id: 'turno' as const, nombre: 'Mi turno' }] : []),
    { id: 'cuenta' as const, nombre: 'Mi cuenta' },
  ];
  // Una cuenta creada con Google llega sin documento: la app abre primero Mi cuenta para completarlo.
  const inicial = usuario.perfilCompleto ? secciones[0].id : 'cuenta';
  const actual = elegida && secciones.some((s) => s.id === elegida) ? elegida : inicial;

  return (
    <View>
      <Text style={estilos.saludo}>Hola, {usuario.nombre}</Text>
      {secciones.length > 1 && <Opciones titulo="Sección" opciones={secciones} valor={actual} onCambio={setElegida} />}
      {!usuario.perfilCompleto && actual !== 'cuenta' && <Aviso tipo="info">Te falta tu documento: complétalo en Mi cuenta.</Aviso>}
      <View style={{ marginTop: espacio[4] }}>
        {actual === 'administracion' && <Administracion />}
        {actual === 'agencia' && <Agencia />}
        {actual === 'indicadores' && <Indicadores />}
        {actual === 'auditoria' && <Auditoria />}
        {actual === 'atencion' && <Funcionario />}
        {actual === 'turno' && <Asociado />}
        {actual === 'cuenta' && <MiCuenta />}
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
