import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

interface Props<T extends string> {
  titulo: string;
  opciones: { id: T; nombre: string }[];
  valor: T | undefined;
  onCambio: (id: T) => void;
}

/**
 * Grupo de opciones táctiles (equivale al <select> de la web). Cada opción mide 48 px de alto y
 * el lector de pantalla las anuncia como botones de radio.
 */
export function Opciones<T extends string>({ titulo, opciones, valor, onCambio }: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={titulo}>
      <Text style={estilos.etiqueta}>{titulo}</Text>
      <View style={estilos.opciones}>
        {opciones.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => onCambio(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: o.id === valor }}
            style={[estilos.opcion, o.id === valor && estilos.opcionElegida]}
          >
            <Text style={{ color: o.id === valor ? '#FFFFFF' : colores.texto }}>{o.nombre}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[3] },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio[2], marginTop: espacio[2] },
  opcion: {
    minHeight: objetivoTactil,
    justifyContent: 'center',
    paddingHorizontal: espacio[3],
    borderRadius: radio,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  opcionElegida: { backgroundColor: colores.primario, borderColor: colores.primario },
});
