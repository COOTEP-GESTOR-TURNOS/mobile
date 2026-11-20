/**
 * Guía visual compartida con la web (frontend/src/estilos/app.css): mismos valores.
 *
 * Identidad COOTEP (colores del logo): el verde es la marca y las acciones; el dorado es un
 * acento escaso para lo que se quiere destacar (el número del turno, la franja recomendada) y
 * nunca comunica un estado. Como texto sobre blanco solo va doradoOscuro.
 */
export const colores = {
  primario: '#19622B', // verde del logo: 7,4:1 con texto blanco
  primarioSuave: '#E8F3EA',
  dorado: '#D9A43A', // bordes y filetes, no texto
  doradoClaro: '#F6DB68', // texto sobre verde (5,4:1)
  doradoOscuro: '#8A6416', // texto dorado sobre blanco o doradoSuave (≥4,9:1)
  doradoSuave: '#FCF5DF',
  texto: '#1F2933',
  textoSecundario: '#52606D',
  fondo: '#F6F7F4',
  superficie: '#FFFFFF',
  borde: '#E3E7E1',
  exito: '#1B7A35',
  aviso: '#8F5500',
  error: '#C62828',
  info: '#1565C0',
  preferencial: '#6A4CC2',
} as const;

export const texto = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, xxl: 32 } as const;
export const espacio = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 } as const;
export const radio = 8;
/** Objetivo táctil mínimo (WCAG): 44 px. */
export const objetivoTactil = 48;
