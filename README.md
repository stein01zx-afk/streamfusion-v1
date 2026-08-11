# StreamFusion 2.0

Rediseño completo del panel principal con cuentas StreamFusion, conexiones TikTok/Twitch separadas, navegación por páginas, personalización, overlays públicos por usuario, widgets y chat deduplicado.

## Inicio

1. `npm install`
2. Copia `.env.example` como `.env`.
3. Rellena `EULER_API_KEY` y `FISH_AUDIO_API_KEY` si vas a usar esas funciones.
4. Ejecuta `npm start`.
5. Abre `http://localhost:3000`.

## Cuenta

La cuenta de StreamFusion usa correo + contraseña con sesiones HttpOnly y datos por `user_id`.

TikTok y Twitch no son el login de StreamFusion. Son conexiones LIVE independientes y pueden desconectarse sin cerrar la cuenta.

## Overlays

Los enlaces públicos se generan por usuario y usan un token en la URL. El socket del overlay se autentica con ese token y entra en la sala del propietario, por lo que el navegador/OBS no necesita iniciar sesión.

El fondo local del overlay no se guarda en la configuración pública.

## Chat

El receptor TikTok se mantiene basado en `tiktok-live-connector`. Los eventos de chat reciben `eventId` cuando la fuente lo proporciona y se aplica deduplicación sin eliminar dos mensajes reales que tengan el mismo texto.

`tiktok-live-connector` es una librería no oficial que recibe eventos del servicio Webcast interno de TikTok LIVE, incluidos comentarios, gifts, miembros, follows, shares y otros eventos. Los estados de privacidad del perfil no se usan como filtro para ocultar comentarios recibidos. 
