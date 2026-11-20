/**
 * URL del backend principal. 10.0.2.2 es el computador visto desde el emulador de Android, pero
 * Android 17 bloquea esa dirección a las apps sin permiso de red local (la conexión queda colgada):
 * en ese caso use la IP del computador en EXPO_PUBLIC_API_URL (ver .env.example).
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000').replace(/\/$/, '');
