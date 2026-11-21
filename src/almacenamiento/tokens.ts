import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * El token de renovación va en el almacenamiento seguro del sistema (Android Keystore), nunca en
 * SQLite. El de acceso dura 10 minutos y vive solo en memoria.
 */
const CLAVE = 'cootep_token_renovacion';

export const tokensSeguros = {
  leer: () =>
    Platform.OS === 'web'
      ? Promise.resolve(globalThis.localStorage?.getItem(CLAVE))
      : SecureStore.getItemAsync(CLAVE),
  guardar: (token: string) =>
    Platform.OS === 'web'
      ? (globalThis.localStorage?.setItem(CLAVE, token), Promise.resolve())
      : SecureStore.setItemAsync(CLAVE, token),
  borrar: () =>
    Platform.OS === 'web'
      ? (globalThis.localStorage?.removeItem(CLAVE), Promise.resolve())
      : SecureStore.deleteItemAsync(CLAVE),
};
