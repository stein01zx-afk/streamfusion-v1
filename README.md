# StreamFusion 4.0

Dashboard multiusuario para TikTok LIVE + Twitch con cuenta StreamFusion, bot de voz, chat, eventos, regalos, ruleta y overlays públicos por usuario.

## Arquitectura

- **Cuenta StreamFusion:** registro e inicio de sesión por usuario/correo y contraseña o TikTok OAuth.
- **Conexiones LIVE:** TikTok y Twitch se guardan por usuario. Desconectar un LIVE no cierra la cuenta StreamFusion.
- **Datos por usuario:** ajustes, voces, ruleta y overlays se guardan en `user_settings`/tablas asociadas al usuario.
- **Overlays:** cada overlay obtiene un token público único. Puede abrirse sin iniciar sesión. El cliente OBS no necesita conocer credenciales.
- **LIVE routing:** `tiktok-live-connector` y TMI se mantienen como receptores; los eventos se emiten a la sala Socket.IO del propietario.
- **Chat:** conserva `eventId`, `sourceEventId`, `receivedAt`, `rawMessage`, avatar, badges, roleState, sticker/emote metadata y deduplicación en cliente.
- **Sticker/emote:** cuando hay una imagen disponible se renderiza; el texto original no se elimina por transformar el evento.
- **Overlay background:** las preferencias de fondo del overlay siguen siendo locales del navegador/OBS y no forman parte de la configuración persistida del usuario.

## Variables de entorno

Copia `.env.example` a `.env` y completa tus credenciales reales. Nunca expongas `TIKTOK_CLIENT_SECRET` ni `EULER_API_KEY` en el frontend.

## Validación

La entrega fue validada mediante `node --check` para todos los archivos JavaScript modificados y comprobaciones estructurales del HTML/IDs. No fue posible ejecutar una prueba end-to-end del servidor en este entorno porque las dependencias npm no estaban disponibles y `npm install` excedió el tiempo de ejecución del entorno.
