/** Guía visual compartida con la web (web/src/estilos/tokens.css). */
export const colores = {
  primario: '#0F6E56',
  primarioSuave: '#E1F5EE',
  texto: '#1F2933',
  textoSecundario: '#52606D',
  fondo: '#F5F7FA',
  superficie: '#FFFFFF',
  borde: '#E4E7EB',
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
