import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, objetivoTactil, texto } from '../tema/tokens';

type NombreIcono = ComponentProps<typeof Ionicons>['name'];

export interface OpcionMenu<T extends string> {
  id: T;
  nombre: string;
  /** Icono de Ionicons: relleno en la sección elegida y de contorno en las demás. */
  icono: { activo: NombreIcono; inactivo: NombreIcono };
}

interface Props<T extends string> {
  opciones: OpcionMenu<T>[];
  valor: T;
  onCambio: (id: T) => void;
}

/**
 * Menú inferior de la app: una pestaña por sección del rol, con icono y texto (el color nunca es la
 * única señal). La elegida va en verde con el filete dorado arriba, como el marco del logo. Deja
 * libre el borde inferior del sistema (barra de gestos o botones de Android).
 */
export function MenuInferior<T extends string>({ opciones, valor, onCambio }: Props<T>) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={[estilos.barra, { paddingBottom: Math.max(bottom, espacio[2]) }]}>
      {opciones.map((o) => {
        const elegida = o.id === valor;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityLabel={o.nombre}
            accessibilityState={{ selected: elegida }}
            onPress={() => onCambio(o.id)}
            style={({ pressed }) => [estilos.pestana, pressed && { opacity: 0.7 }]}
          >
            <View style={[estilos.filete, elegida && estilos.fileteElegido]} />
            <View style={[estilos.pildora, elegida && estilos.pildoraElegida]}>
              <Ionicons
                name={elegida ? o.icono.activo : o.icono.inactivo}
                size={22}
                color={elegida ? colores.primario : colores.textoSecundario}
              />
            </View>
            <Text numberOfLines={1} style={[estilos.texto, elegida && estilos.textoElegido]}>
              {o.nombre}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: colores.superficie,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  pestana: { flex: 1, alignItems: 'center', minHeight: objetivoTactil + espacio[3] },
  filete: { alignSelf: 'stretch', height: 3, marginHorizontal: espacio[3], marginBottom: espacio[2], borderRadius: 2 },
  fileteElegido: { backgroundColor: colores.dorado },
  pildora: { paddingHorizontal: espacio[4], paddingVertical: 2, borderRadius: 999 },
  pildoraElegida: { backgroundColor: colores.primarioSuave },
  texto: { fontSize: texto.xs, color: colores.textoSecundario, marginTop: 2, paddingHorizontal: 2 },
  textoElegido: { color: colores.primario, fontWeight: '600' },
});
