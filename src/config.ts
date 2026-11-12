/** URL del backend principal. 10.0.2.2 es el computador visto desde el emulador de Android. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000').replace(/\/$/, '');
