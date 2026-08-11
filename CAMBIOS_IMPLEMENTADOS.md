# StreamFusion – cambios implementados

## Separación de responsabilidades
- El dashboard usa `personalization` únicamente para su interfaz interna y preview.
- El overlay de Chat/Eventos/Regalos no consume esa personalización; mantiene su propio diseño/estado de overlay.
- La conexión de TikTok/Twitch sigue siendo compartida con los overlays mediante Socket.IO.
- Ruleta y lista de voces siguen siendo salidas independientes para OBS.

## Barra superior
- TikTok: avatar genérico de plataforma.
- Twitch: avatar real del canal cuando puede resolverse.
- La cuenta local del dashboard mantiene su propio avatar visual independiente.

## Chat del dashboard
- Vista previa real con los mensajes que llegan por Socket.IO.
- La vista previa se actualiza al recibir nuevos comentarios.
- Los ajustes de avatar, marco de comentario, tamaños, peso, flujo y efectos modifican la representación del dashboard.

## Voces
- Separado en una sección propia del Widget.
- Cada voz queda asociada al usuario autenticado en SQLite.
- Campos: nombre, ID Fish Audio, autor, descripción, tags, disponible para bot y disponible para ruleta.
- Edición/eliminación por ID.
- Búsqueda automática en Fish Audio por nombre.
- Al seleccionar una coincidencia, se rellenan ID/nombre/autor/descripción para guardarla.

## Ruleta
- Los tags de las voces personalizadas se consideran alias de selección para la fase de comentario del ganador.
- Solo se consideran voces personalizadas habilitadas para bot y ruleta.
- Las voces personalizadas usan la clave `fish:<id>`.

## Base de datos
- Migración automática para instalaciones existentes.
- Nuevas columnas en `user_voices`: `tags`, `bot_enabled`, `roulette_enabled`.

## Validación
- Todos los archivos JavaScript del proyecto pasan `node --check`.
- No se incluye `node_modules`; debe ejecutarse `npm install` al desplegar.
