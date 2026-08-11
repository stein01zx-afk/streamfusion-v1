# StreamFusion 4

## Arquitectura
- Cuenta independiente de StreamFusion con registro e inicio de sesión por correo/usuario + contraseña.
- TikTok y Twitch son conexiones LIVE independientes de la cuenta web; se conectan y desconectan desde el panel.
- La configuración del usuario se persiste en SQLite y se carga automáticamente al iniciar sesión.
- Los eventos LIVE se aíslan por cuenta mediante salas Socket.IO; un usuario no recibe el LIVE de otro usuario.
- `tiktok-live-connector` sigue siendo el receptor TikTok y usa `EULER_API_KEY` para la firma.
- El chat se normaliza y deduplica por identificador de evento antes de llegar al overlay/UI. Mensajes legítimos con el mismo texto no se eliminan.
- Overlays públicos generan enlaces únicos por usuario y funcionan sin iniciar sesión. El fondo cromático de la interfaz del overlay se mantiene local al navegador/OBS y no se guarda en el perfil.
- La interfaz principal fue reorganizada en Dashboard, Chat, Eventos, Regalos, Ruleta, Personalización, Overlays, Widgets y Ajustes.
- Personalización se agrupa por superficie: Chat, Eventos, Regalos y Overlay.
- Widgets queda dedicado al widget de voces; el apartado de cambio de voz en tiempo real no aparece en la interfaz principal.

## Credenciales
Copia `.env` y completa tus claves reales antes de ejecutar. No publiques secretos dentro del ZIP ni en el frontend.

```env
PORT=3000
EULER_API_KEY=
FISH_AUDIO_API_KEY=
FISH_AUDIO_MODEL=s2.1-pro-free
FISH_AUDIO_VOICE_VERITY=
FISH_AUDIO_VOICE_NARUTO=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=http://localhost:3000/auth/tiktok/callback
TIKTOK_SCOPES=user.info.basic
```

## Ejecución
```bash
npm install
npm start
```

La aplicación usa SQLite en `data/streamfusion.db`.
