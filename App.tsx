import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Administracion } from './src/pantallas/Administracion';
import { Asociado } from './src/pantallas/Asociado';
import { Funcionario } from './src/pantallas/Funcionario';
import { Ingresar } from './src/pantallas/Ingresar';
import { ProveedorSesion, useSesion } from './src/sesion';
import { colores, espacio, objetivoTactil, texto } from './src/tema/tokens';

/** Cada rol ve su pantalla; el backend vuelve a verificar los permisos en cada API. */
function PantallaPorRol() {
  const { usuario, cargando, cerrarSesion } = useSesion();
  if (cargando) return <ActivityIndicator color={colores.primario} style={{ marginTop: espacio[7] }} />;
  if (!usuario) return <Ingresar />;

  const roles = usuario.roles.map((r) => r.rol);
  const pantalla = roles.includes('SUPERADMIN') ? (
    <Administracion />
  ) : roles.includes('FUNCIONARIO') || roles.includes('ADMIN_AGENCIA') ? (
    <Funcionario />
  ) : roles.includes('ASOCIADO') ? (
    <Asociado />
  ) : (
    <Text>Tu rol no tiene una pantalla en la app.</Text>
  );

  return (
    <View>
      {pantalla}
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
      <ScrollView style={estilos.fondo} contentContainerStyle={estilos.contenido}>
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
  salir: { minHeight: objetivoTactil, justifyContent: 'center', alignItems: 'center', marginTop: espacio[6] },
  textoSalir: { color: colores.primario, fontSize: texto.md, fontWeight: '600' },
});
