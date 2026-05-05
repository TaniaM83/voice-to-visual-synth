@echo off
REM Lanza el monorepo (server Express + client Vite) y abre el navegador.
REM Doble clic en este archivo o ejecutalo desde una terminal.
setlocal

cd /d "%~dp0"

echo.
echo === Voice to Visual Synth ===
echo Arrancando server y client (npm run dev)...
echo Cierra la ventana negra que se abrira para detener el programa.
echo.

REM Abre los dev servers en una ventana nueva que queda viva (cmd /k).
start "Voice to Visual Synth - dev servers" cmd /k "npm run dev"

REM Espera a que Vite este listo antes de abrir el navegador.
timeout /t 6 /nobreak >nul

REM Abre el navegador por defecto en la URL de Vite.
REM (Si el puerto 5173 estuviera ocupado, Vite usaria 5174; mira la consola.)
start "" http://localhost:5173/

endlocal
