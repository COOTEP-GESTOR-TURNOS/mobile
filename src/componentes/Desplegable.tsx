import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

export interface OpcionDesplegable<T extends string> {
  id: T;
  nombre: string;
  /** Texto secundario bajo el nombre, por ejemplo «Cerrada». */
  detalle?: string;
}

interface Props<T extends string> {
  titulo: string;
  opciones: OpcionDesplegable<T>[];
  valor: T | undefined;
  onCambio: (id: T) => void;
  /** Texto del campo cuando aún no hay nada elegido. */
  marcador?: string;
}

/**
 * Selector compacto para listas largas (equivale al <select> de la web): el campo muestra solo la
 * opción elegida y, al tocarlo, sube una hoja desde abajo con la lista completa. Ocupa una línea
 * en la pantalla en lugar de una fila de botones por cada opción.
 */
export function Desplegable<T extends string>({ titulo, opciones, valor, onCambio, marcador = 'Elige una opción' }: Props<T>) {
  const [abierto, setAbierto] = useState(false);
  const { bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const elegida = opciones.find((o) => o.id === valor);

  function elegir(id: T) {
    setAbierto(false);
    if (id !== valor) onCambio(id);
  }

  return (
    <View>
      <Text style={estilos.etiqueta}>{titulo}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${titulo}: ${elegida?.nombre ?? marcador}`}
        accessibilityHint="Abre la lista para cambiarla"
        onPress={() => setAbierto(true)}
        style={({ pressed }) => [estilos.campo, pressed && { borderColor: colores.primario }]}
      >
        <Text numberOfLines={1} style={[estilos.valor, !elegida && { color: colores.textoSecundario }]}>
          {elegida?.nombre ?? marcador}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colores.textoSecundario} />
      </Pressable>

      <Modal
        visible={abierto}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setAbierto(false)}
      >
        {/* Tocar fuera de la hoja la cierra sin cambiar nada */}
        <Pressable style={estilos.fondo} accessibilityLabel="Cerrar la lista" onPress={() => setAbierto(false)} />
        <View style={[estilos.hoja, { paddingBottom: bottom + espacio[2], maxHeight: height * 0.7 }]}>
          <View style={estilos.filete} />
          <View style={estilos.cabecera}>
            <Text style={estilos.tituloHoja} accessibilityRole="header">
              {titulo}
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => setAbierto(false)} style={estilos.cerrar}>
              <Ionicons name="close" size={24} color={colores.textoSecundario} />
            </Pressable>
          </View>
          <ScrollView accessibilityRole="radiogroup">
            {opciones.map((o) => {
              const marcada = o.id === valor;
              return (
                <Pressable
                  key={o.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: marcada }}
                  onPress={() => elegir(o.id)}
                  style={({ pressed }) => [estilos.opcion, marcada && estilos.opcionMarcada, pressed && { opacity: 0.7 }]}
                >
                  <View style={estilos.textos}>
                    <Text style={[estilos.nombre, marcada && estilos.nombreMarcado]}>{o.nombre}</Text>
                    {o.detalle ? <Text style={estilos.detalle}>{o.detalle}</Text> : null}
                  </View>
                  {marcada && <Ionicons name="checkmark" size={22} color={colores.primario} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[3], marginBottom: espacio[2] },
  campo: {
    minHeight: objetivoTactil,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
    paddingHorizontal: espacio[3],
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio,
    backgroundColor: colores.superficie,
  },
  valor: { flex: 1, fontSize: texto.md, color: colores.texto },
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  hoja: {
    backgroundColor: colores.superficie,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: espacio[4],
  },
  // Filete dorado como agarradera de la hoja (identidad del logo)
  filete: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colores.dorado, marginTop: espacio[2] },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: espacio[2] },
  tituloHoja: { fontSize: texto.lg, fontWeight: '600', color: colores.texto },
  cerrar: { width: objetivoTactil, height: objetivoTactil, alignItems: 'center', justifyContent: 'center', marginRight: -espacio[3] },
  opcion: {
    minHeight: objetivoTactil,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio[2],
    paddingHorizontal: espacio[3],
    paddingVertical: espacio[2],
    borderRadius: radio,
  },
  opcionMarcada: { backgroundColor: colores.primarioSuave },
  textos: { flex: 1 },
  nombre: { fontSize: texto.md, color: colores.texto },
  nombreMarcado: { color: colores.primario, fontWeight: '600' },
  detalle: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: 2 },
});
