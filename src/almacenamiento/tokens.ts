import * as SecureStore from 'expo-secure-store';

/** Los tokens van en el almacenamiento seguro del sistema (Android Keystore), nunca en SQLite. */
const CLAVE = 'cootep_token_acceso';

export const tokensSeguros = {
  leer: () => SecureStore.getItemAsync(CLAVE),
  guardar: (token: string) => SecureStore.setItemAsync(CLAVE, token),
  borrar: () => SecureStore.deleteItemAsync(CLAVE),
};
