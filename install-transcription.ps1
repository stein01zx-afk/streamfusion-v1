$ErrorActionPreference = 'Stop'
$python = $null
try { python --version | Out-Null; $python = 'python' } catch {}
if (-not $python) {
  try { py -3 --version | Out-Null; $python = 'py -3' } catch {}
}
if (-not $python) { throw 'Python 3.10+ no esta instalado.' }
Invoke-Expression "$python -m pip install --upgrade pip"
Invoke-Expression "$python -m pip install -r python-transcription/requirements.txt"
Write-Host 'Motor local faster-whisper instalado correctamente.'
Write-Host 'El modelo medium se descargara la primera vez que transcribas.'
