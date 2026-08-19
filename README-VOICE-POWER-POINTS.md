# StreamFusion — Bot de voz + Sistema de puntos

## Cambios incluidos

- El overlay de chat sigue consumiendo la misma configuración `personal` guardada desde el Dashboard para fuente, tema, layout, dirección, marcos, tamaños, badges, colores, efectos y autolimpieza.
- Nueva sección **Bot de voz** en el Dashboard para configurar el poder 🔥.
- Tres modos de desbloqueo: **Por regalo/Bits**, **Por puntos** y **Por actividad**.
- Regalo TikTok configurable por nombre; Twitch configurable por cantidad de Bits.
- Puntos configurables y descontados al desbloquear el poder.
- Actividades: like, suscripción, seguidor, moderador TikTok y moderador Twitch.
- El prefijo del comando es configurable (por defecto `.`).
- Con el poder activo, un comentario como `.Goku Hola chat` usa la voz Goku y lee `Hola chat`.
- Las voces se resuelven por nombre, ID, tag o alias desde el catálogo cargado por el bot, incluyendo voces personales configuradas en `personalVoices`.
- Usuarios con poder activo reciben la insignia exclusiva **🔥** en Dashboard y Overlay Chat.
- Nueva sección **Sistema de puntos** en la barra lateral.
- Ventanas pequeñas para consultar/eliminar usuarios con 🔥 y consultar el ranking de puntos.
- Moderadores se validan por plataforma con las insignias/flags de Twitch y TikTok sin mezclarlas.
- API CRUD para `personalVoices` para que la biblioteca personal pueda alimentar el selector de voces.

## Nota sobre Twitch seguidores

La implementación actual de Twitch usa `tmi.js`, por lo que la detección de seguimiento de Twitch queda preparada para eventos `follow` que lleguen al pipeline, pero el conector actual no incluye EventSub/OAuth de seguidores. Para garantizar eventos de follow de Twitch de forma independiente del IRC sería necesario añadir Twitch EventSub con autenticación del broadcaster.
