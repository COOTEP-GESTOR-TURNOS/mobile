import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

type Variante = 'primario' | 'secundario' | 'peligro';

interface Props {
  titulo: string;
  onPress: () => void;
  cargando?: boolean;
  variante?: Variante;
  deshabilitado?: boolean;
}

const COLOR_TEXTO: Record<Variante, string> = { primario: '#FFFFFF', secundario: colores.primario, peligro: colores.error };

/** Microinteracción: mientras carga muestra un indicador y no acepta otro toque. */
export function Boton({ titulo, onPress, cargando = false, variante = 'primario', deshabilitado = false }: Props) {
  const inactivo = cargando || deshabilitado;
  const primario = variante === 'primario';
  const colorTexto = COLOR_TEXTO[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ busy: cargando, disabled: inactivo }}
      disabled={inactivo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        primario ? estilos.primario : { borderColor: colorTexto, backgroundColor: colores.superficie },
        (pressed || inactivo) && { opacity: 0.7 },
      ]}
    >
      {cargando ? <ActivityIndicator color={colorTexto} /> : <Text style={[estilos.texto, { color: colorTexto }]}>{titulo}</Text>}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: objetivoTactil,
    paddingHorizontal: espacio[5],
    borderRadius: radio,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: espacio[3],
  },
  primario: { backgroundColor: colores.primario },
  texto: { fontSize: texto.md, fontWeight: '600' },
});
