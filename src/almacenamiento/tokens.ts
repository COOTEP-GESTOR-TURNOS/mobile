import * as SecureStore from 'expo-secure-store';

/**
 * El token de renovación va en el almacenamiento seguro del sistema (Android Keystore), nunca en
 * SQLite. El de acceso dura 10 minutos y vive solo en memoria.
 */
const CLAVE = 'cootep_token_renovacion';

export const tokensSeguros = {
  leer: () => SecureStore.getItemAsync(CLAVE),
  guardar: (token: string) => SecureStore.setItemAsync(CLAVE, token),
  borrar: () => SecureStore.deleteItemAsync(CLAVE),
};
