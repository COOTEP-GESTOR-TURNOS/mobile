import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { type ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from './src/componentes/Campo';
import { MenuInferior, type OpcionMenu } from './src/componentes/MenuInferior';
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
import { colores, espacio, objetivoTactil, radio, texto } from './src/tema/tokens';

// Cierra la pestaña del navegador cuando Google devuelve el control a la app.
WebBrowser.maybeCompleteAuthSession();

type Seccion = 'administracion' | 'agencia' | 'indicadores' | 'auditoria' | 'atencion' | 'turno' | 'cuenta';

/** Icono de cada sección en el menú inferior (los mismos conceptos que los iconos de la web). */
const ICONOS: Record<Seccion, OpcionMenu<Seccion>['icono']> = {
  administracion: { activo: 'people', inactivo: 'people-outline' },
  agencia: { activo: 'business', inactivo: 'business-outline' },
  indicadores: { activo: 'bar-chart', inactivo: 'bar-chart-outline' },
  auditoria: { activo: 'shield-checkmark', inactivo: 'shield-checkmark-outline' },
  atencion: { activo: 'headset', inactivo: 'headset-outline' },
  turno: { activo: 'ticket', inactivo: 'ticket-outline' },
  cuenta: { activo: 'person-circle', inactivo: 'person-circle-outline' },
};

/**
 * Área con desplazamiento bajo el encabezado. Sin menú inferior, deja libre el borde del sistema
 * (barra de gestos de Android) para que el último botón no quede debajo.
 */
function Desplazable({ children, conMenu = false }: { children: ReactNode; conMenu?: boolean }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <ScrollView
      style={estilos.fondo}
      contentContainerStyle={[estilos.contenido, !conMenu && { paddingBottom: espacio[5] + bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

/** Sin sesión: ingresar, registrarse o recuperar la contraseña, con el lema de la cooperativa debajo. */
function Acceso() {
  const [pantalla, setPantalla] = useState<'ingresar' | 'registro' | 'recuperar'>('ingresar');
  return (
    <View>
      {pantalla === 'registro' && <Registro volver={() => setPantalla('ingresar')} />}
      {pantalla === 'recuperar' && <Recuperar volver={() => setPantalla('ingresar')} />}
      {pantalla === 'ingresar' && <Ingresar irA={setPantalla} />}
      <Text style={estilos.lema}>«Crecemos sólidos para servir»</Text>
    </View>
  );
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
  if (cargando) {
    return (
      <View style={estilos.fondo}>
        <ActivityIndicator color={colores.primario} style={{ marginTop: espacio[7] }} />
      </View>
    );
  }
  if (!usuario) {
    return (
      <Desplazable>
        <Acceso />
      </Desplazable>
    );
  }

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
  const conMenu = secciones.length > 1;

  return (
    <View style={estilos.fondo}>
      {/* key: cada sección abre desde arriba, no donde quedó el desplazamiento de la anterior */}
      <Desplazable key={actual} conMenu={conMenu}>
        <Text style={estilos.saludo}>Hola, {usuario.nombre}</Text>
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
        {/* Cerrar sesión vive en Mi cuenta, como en la mayoría de apps con menú inferior */}
        {actual === 'cuenta' && (
          <Pressable
            accessibilityRole="button"
            onPress={() => void cerrarSesion()}
            style={({ pressed }) => [estilos.salir, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="log-out-outline" size={20} color={colores.error} />
            <Text style={estilos.textoSalir}>Cerrar sesión</Text>
          </Pressable>
        )}
      </Desplazable>
      {conMenu && (
        <MenuInferior opciones={secciones.map((s) => ({ ...s, icono: ICONOS[s.id] }))} valor={actual} onCambio={setElegida} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ProveedorSesion>
        <View style={estilos.encabezado}>
          <Text style={estilos.marca} accessibilityRole="header">
            <Text style={estilos.marcaDorada}>COOTEP</Text> Turno
          </Text>
        </View>
        <PantallaPorRol />
        <StatusBar style="light" />
      </ProveedorSesion>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  // Barra verde con filete dorado, como el marco del logo.
  encabezado: {
    backgroundColor: colores.primario,
    paddingTop: espacio[7],
    paddingBottom: espacio[4],
    paddingHorizontal: espacio[5],
    borderBottomWidth: 4,
    borderBottomColor: colores.dorado,
  },
  marca: { color: '#FFFFFF', fontSize: texto.lg, fontWeight: '600' },
  marcaDorada: { color: colores.doradoClaro, fontWeight: '700' },
  lema: { color: colores.doradoOscuro, fontSize: texto.sm, fontStyle: 'italic', textAlign: 'center', marginTop: espacio[6] },
  fondo: { flex: 1, backgroundColor: colores.fondo },
  contenido: { padding: espacio[5] },
  saludo: { fontSize: texto.md, color: colores.textoSecundario },
  salir: {
    minHeight: objetivoTactil,
    flexDirection: 'row',
    gap: espacio[2],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: espacio[6],
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio,
    backgroundColor: colores.superficie,
  },
  textoSalir: { color: colores.error, fontSize: texto.md, fontWeight: '600' },
});
