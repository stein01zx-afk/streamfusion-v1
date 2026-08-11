# StreamFusion

## Qué cambia en esta versión
- Cuenta propia de StreamFusion con registro/login por correo y contraseña.
- Registro/login con TikTok OAuth 2.0; la identidad de TikTok queda vinculada a la cuenta StreamFusion.
- La conexión LIVE de TikTok/Twitch está separada de la cuenta web. Desconectar un LIVE no cierra la sesión de StreamFusion.
- Cuando un TikTok LIVE está conectado queda bloqueado para evitar cambiar de cuenta accidentalmente; después de desconectarlo se puede conectar otro.
- Configuración persistente por usuario y sincronizada por Socket.IO a las páginas abiertas y overlays del propietario.
- Overlays con enlace público: funcionan sin iniciar sesión y se unen únicamente a la sala del propietario.
- Rediseño con sidebar contraíble, top bar fija y paneles de chat/eventos/regalos más ordenados.
- Se conserva el diseño del overlay de chat y se amplían los datos del usuario, badges/roles confirmados, stickers y regalos.
- Deduplicación por `eventId`/huella estable: dos mensajes legítimos con el mismo texto no se eliminan.
- `tiktok-live-connector` sigue siendo el receptor del LIVE y usa la firma de Euler; no se abre una segunda conexión paralela para el mismo LIVE.
- Se retiró del menú principal el apartado de cambio de voz en tiempo real. El bot de voz, chat overlay, eventos, regalos, ruleta y demás herramientas se conservan.

## TikTok OAuth
Configura en `.env` (no compartas el Secret):

```env
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=https://TU-DOMINIO/auth/tiktok/callback
TIKTOK_SCOPES=user.info.basic
```

Registra exactamente el Redirect URI en TikTok Developer / Login Kit.

## Euler
La integración LIVE usa `tiktok-live-connector` con `EULER_API_KEY`. Esta versión no crea una segunda conexión WebSocket para el mismo LIVE, lo que evita duplicados y reduce el riesgo de perder/duplicar eventos por doble transporte.

## Ejecución

```bash
npm install
npm start
```

La aplicación usa SQLite en `data/streamfusion.db`.

## Validación realizada
Se validó la sintaxis de `server.js`, todos los servicios JavaScript y los scripts inline del overlay. También se verificaron IDs HTML duplicados en los overlays principales.

La ejecución end-to-end no se pudo completar en este entorno porque la instalación de dependencias npm no terminó a tiempo; las claves quedan en `.env.example` para configurarlas en tu servidor.
