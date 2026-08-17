@echo off
setlocal
python --version >nul 2>&1
if errorlevel 1 (
  py -3 --version >nul 2>&1
  if errorlevel 1 (
    echo Python 3 no esta instalado. Instala Python 3.10+ y vuelve a ejecutar este archivo.
    exit /b 1
  )
  set PY=py -3
) else (
  set PY=python
)
%PY% -m pip install --upgrade pip
%PY% -m pip install -r python-transcription\requirements.txt
if errorlevel 1 (
  echo No se pudieron instalar las dependencias de transcripcion.
  exit /b 1
)
echo.
echo Motor local faster-whisper instalado correctamente.
echo El modelo medium se descargara la primera vez que transcribas.
