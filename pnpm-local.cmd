@echo off
setlocal
set "TRAINING_RUNTIME=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies"
if exist "%TRAINING_RUNTIME%\bin\fallback\pnpm.cmd" goto bundled
where pnpm.cmd >nul 2>nul
if errorlevel 1 (
  echo pnpm was not found. Install Node.js and pnpm, or run this project on the Codex workstation.
  exit /b 1
)
call pnpm.cmd %*
exit /b %ERRORLEVEL%
:bundled
set "PATH=%TRAINING_RUNTIME%\node\bin;%TRAINING_RUNTIME%\bin\fallback;%PATH%"
call "%TRAINING_RUNTIME%\bin\fallback\pnpm.cmd" %*
exit /b %ERRORLEVEL%
