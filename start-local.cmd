@echo off
setlocal
cd /d "%~dp0"
if not exist ".dev.vars" (
  echo Create .dev.vars from .dev.vars.example and set HOST_PASSPHRASE first.
  pause
  exit /b 1
)
if not exist "node_modules\.modules.yaml" (
  call "%~dp0pnpm-local.cmd" install --frozen-lockfile
  if errorlevel 1 goto failed
)
echo Starting 4Seas Live Training. Open http://localhost:5173 when ready.
echo Keep this window open. Press Ctrl+C to stop.
call "%~dp0pnpm-local.cmd" dev
if errorlevel 1 goto failed
exit /b 0
:failed
echo The app could not start. Read the error above.
pause
exit /b 1
