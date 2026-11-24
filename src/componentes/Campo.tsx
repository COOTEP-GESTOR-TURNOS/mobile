import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colores, espacio, objetivoTactil, radio, texto } from '../tema/tokens';

interface Props extends TextInputProps {
  etiqueta: string;
  ayuda?: string;
  error?: string | null;
  /** Contraseña: oculta el texto y agrega el botón para mostrarlo. */
  clave?: boolean;
}

/** Campo con etiqueta y ayuda; el lector de pantalla lee la etiqueta y la ayuda juntas. */
export function Campo({ etiqueta, ayuda, error, clave = false, style, ...entrada }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        style={[estilos.campo, error ? { borderColor: colores.error } : null, style]}
        accessibilityLabel={etiqueta}
        accessibilityHint={error ?? ayuda}
        secureTextEntry={clave && !visible}
        autoCapitalize={clave ? 'none' : entrada.autoCapitalize}
        placeholderTextColor={colores.textoSecundario}
        {...entrada}
      />
      <AyudaCampo error={error} ayuda={ayuda} />
      {clave && <MostrarClave visible={visible} alternar={() => setVisible((v) => !v)} />}
    </View>
  );
}

/** Debajo del campo: el error si lo hay; si no, la ayuda. */
function AyudaCampo({ error, ayuda }: { error?: string | null; ayuda?: string }) {
  const mensaje = error || ayuda;
  if (!mensaje) return null;
  return <Text style={[estilos.ayuda, error ? { color: colores.error } : null]}>{mensaje}</Text>;
}

function MostrarClave({ visible, alternar }: { visible: boolean; alternar: () => void }) {
  return (
    <Pressable onPress={alternar} accessibilityRole="button" style={estilos.mostrar}>
      <Text style={estilos.textoMostrar}>{visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}</Text>
    </Pressable>
  );
}

/** Mensaje de error o de éxito que el lector de pantalla anuncia al aparecer. */
export function Aviso({ tipo = 'error', children }: { tipo?: 'error' | 'exito' | 'info'; children: string }) {
  const color = tipo === 'error' ? colores.error : tipo === 'exito' ? colores.exito : colores.info;
  return (
    <Text style={[estilos.aviso, { borderColor: color, color }]} accessibilityLiveRegion={tipo === 'error' ? 'assertive' : 'polite'}>
      {children}
    </Text>
  );
}

const estilos = StyleSheet.create({
  contenedor: { marginTop: espacio[3] },
  etiqueta: { fontSize: texto.sm, color: colores.textoSecundario, marginBottom: espacio[1] },
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
  ayuda: { fontSize: texto.sm, color: colores.textoSecundario, marginTop: espacio[1] },
  mostrar: { minHeight: objetivoTactil, justifyContent: 'center' },
  textoMostrar: { color: colores.primario, fontSize: texto.sm, textDecorationLine: 'underline' },
  aviso: {
    borderWidth: 1,
    borderRadius: radio,
    padding: espacio[3],
    marginTop: espacio[3],
    backgroundColor: colores.superficie,
    fontSize: texto.sm,
  },
});
