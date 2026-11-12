# movil · COOTEP Turno

App Android en **React Native con Expo SDK 58**. Ofrece las mismas funciones que la web, adaptadas
al teléfono: el asociado pide y sigue su turno (con vibración al quedar próximo), el funcionario
llama y atiende, y los administradores tienen su pantalla (pendiente).

| Archivo | Contenido |
| --- | --- |
| `App.tsx` | Pantalla según el rol |
| `src/pantallas` | Ingresar, Asociado, Funcionario, Administracion |
| `src/almacenamiento/tokens.ts` | Token en almacenamiento seguro (Android Keystore) |
| `src/almacenamiento/local.ts` | SQLite: preferencias y último turno para ver el estado sin conexión |
| `src/tema/tokens.ts` | Guía visual compartida con la web |

## Desarrollo

```bash
npm ci
cp .env.example .env     # EXPO_PUBLIC_API_URL con la IP del computador en la red Wi-Fi
npx expo start           # abrir con Expo Go o un emulador de Android
npm run typecheck
```

Agregue dependencias siempre con `npx expo install <paquete>`: elige la versión compatible con el SDK.

## Generar la APK

1. Ponga la IP del servidor en `eas.json` (perfil `preview`, variable `EXPO_PUBLIC_API_URL`).
2. Con una cuenta gratuita de Expo: `npx eas-cli login` y luego `npm run apk`
   (`eas build -p android --profile preview`). Al terminar, EAS entrega el enlace de la APK.
3. Sin EAS, con Android Studio instalado: `npx expo prebuild -p android` y
   `cd android && ./gradlew assembleRelease`.
4. Instale la APK en el teléfono permitiendo apps de orígenes desconocidos.

El teléfono y el computador deben estar en la misma red. La app permite HTTP sin cifrar
(`usesCleartextTraffic` en `app.json`) solo para la demostración en red local; en producción
la API debe ir por HTTPS.
