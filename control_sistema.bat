@echo off
setlocal enabledelayedexpansion

:menu
cls
echo ===================================================
echo             SISTEMA DE COMANDAS - CONTROL
echo ===================================================
echo  1. Iniciar Servidores (Backend + Frontend)
echo  2. Detener Servidores (Liberar puertos 8000 y 3000)
echo  3. Verificar Estado de los Puertos
echo  4. Reiniciar Base de Datos (reset_db)
echo  5. Salir
echo ===================================================
set /p opcion="Seleccione una opcion [1-5]: "

if "%opcion%"=="1" goto iniciar
if "%opcion%"=="2" goto detener
if "%opcion%"=="3" goto estado
if "%opcion%"=="4" goto reset
if "%opcion%"=="5" goto salir
goto menu

:iniciar
echo.
echo Iniciando servidores...
echo [INFO] Iniciando backend en puerto 8000...
start "Backend (FastAPI)" cmd /c "cd /d %~dp0backend && venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
timeout /t 2 >nul

echo [INFO] Iniciando frontend en puerto 3000...
start "Frontend (Next.js)" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo [OK] Comandos de inicio ejecutados en ventanas separadas.
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
pause
goto menu

:detener
echo.
echo Deteniendo servidores...

:: Detener procesos en puerto 8000 (Backend)
echo Buscando proceso en puerto 8000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    echo [INFO] Deteniendo Backend (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

:: Detener procesos en puerto 3000 (Frontend)
echo Buscando proceso en puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo [INFO] Deteniendo Frontend (PID %%a)...
    taskkill /f /pid %%a >nul 2>&1
)

echo [OK] Procesos detenidos con exito.
echo.
pause
goto menu

:estado
echo.
echo === ESTADO DE LOS PUERTOS ===
set "back_run=0"
set "front_run=0"

netstat -aon | findstr :8000 | findstr LISTENING >nul
if !errorlevel! equ 0 (
    echo Backend (Puerto 8000): ACTIVO
    set "back_run=1"
) else (
    echo Backend (Puerto 8000): INACTIVO
)

netstat -aon | findstr :3000 | findstr LISTENING >nul
if !errorlevel! equ 0 (
    echo Frontend (Puerto 3000): ACTIVO
    set "front_run=1"
) else (
    echo Frontend (Puerto 3000): INACTIVO
)
echo =============================
echo.
pause
goto menu

:reset
echo.
echo Ejecutando reinicio de base de datos...
if exist "%~dp0reset_db.exe" (
    call "%~dp0reset_db.exe"
) else (
    cd /d %~dp0backend
    venv\Scripts\python "%~dp0reset_db.py"
)
echo.
pause
goto menu

:salir
exit
