import Constants from 'expo-constants';

const PUERTO_BACKEND = 3000;

/**
 * En desarrollo el backend corre en el mismo computador que sirve la app (Metro). Expo informa
 * desde qué dirección se cargó la app (hostUri, por ejemplo «192.168.100.42:8081»): si el teléfono
 * o el emulador llegaron a Metro por esa IP, también llegan al backend. Así la app sigue
 * funcionando cuando el computador cambia de red (cable, Wi-Fi, punto de acceso) sin editar nada.
 */
function backendDelComputador(): string | null {
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  // Solo una IPv4 de la red: «localhost» o un túnel (ngrok) no sirven para llegar al backend.
  return host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host) && !host.startsWith('127.') ? `http://${host}:${PUERTO_BACKEND}` : null;
}

/**
 * URL del backend principal, en este orden:
 * 1. EXPO_PUBLIC_API_URL, si se define (la APK la trae de eas.json; en desarrollo es opcional).
 * 2. La IP del computador que sirve la app (desarrollo con Expo Go o el emulador).
 * 3. 10.0.2.2, el computador visto desde el emulador. Android 17 bloquea esa dirección a las apps
 *    sin permiso de red local, por eso queda como último recurso.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? backendDelComputador() ?? `http://10.0.2.2:${PUERTO_BACKEND}`).replace(/\/$/, '');
