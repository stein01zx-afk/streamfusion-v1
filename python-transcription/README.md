# Motor local de transcripción

StreamFusion usa `faster-whisper` para la sección **Transcripción**. No necesita créditos de Fish Audio para ASR.

## Windows

Ejecuta `install-transcription.bat` desde la carpeta raíz del proyecto.

## PowerShell

Ejecuta `powershell -ExecutionPolicy Bypass -File .\\install-transcription.ps1`.

El primer audio descargará el modelo configurado (`medium` por defecto). Eso puede tardar y ocupar varios GB según el modelo elegido.

Variables opcionales:

- `TRANSCRIPTION_MODEL=medium`
- `TRANSCRIPTION_DEVICE=cpu` o `cuda`
- `TRANSCRIPTION_COMPUTE_TYPE=int8` en CPU, `float16` en NVIDIA
- `TRANSCRIPTION_MODEL_DIR=` carpeta para la caché de modelos
- `TRANSCRIPTION_PYTHON=python` ruta/comando del intérprete
