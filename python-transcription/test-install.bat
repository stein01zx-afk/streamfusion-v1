@echo off
setlocal
python --version >nul 2>&1
if errorlevel 1 (
  py -3 --version >nul 2>&1
  if errorlevel 1 (echo Python 3 no encontrado.&exit /b 1)
  py -3 -c "import faster_whisper; print('faster-whisper OK:', faster_whisper.__version__)"
) else (
  python -c "import faster_whisper; print('faster-whisper OK:', faster_whisper.__version__)"
)
