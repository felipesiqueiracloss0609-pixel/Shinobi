@echo off
setlocal
title Shinobi no Vale - Importador da Base Narutibia

echo.
echo ==========================================
echo   SHINOBI NO VALE - IMPORTADOR DE BASE
echo ==========================================
echo.
echo Coloque estes arquivos em uma pasta:
echo   MAPA1.otbm
echo   items.otb
echo   Tibia.dat
echo   Tibia.spr
echo   Tibia.otfi
echo   MAPA1-house.xml
echo   MAPA1-spawn.xml
echo.
set /p SRC=Digite o caminho da pasta fonte: 
if "%SRC%"=="" exit /b 1

if not exist "%SRC%\MAPA1.otbm" echo MAPA1.otbm nao encontrado.& exit /b 2
if not exist "%SRC%\Tibia.spr" echo Tibia.spr nao encontrado.& exit /b 2

call npm install
if errorlevel 1 exit /b 3

if not exist "%SRC%\exports" mkdir "%SRC%\exports"

echo.
echo [1/3] Inspecionando arquivos...
call npm run assets:inspect -- "%SRC%" "%SRC%\exports\source-inspection.json"
if errorlevel 1 exit /b 4

echo.
echo [2/3] Processando mapa...
call npm run map:inspect -- "%SRC%\MAPA1.otbm" "%SRC%\exports\map-inspection.json"
if errorlevel 1 echo Aviso: inspector de mapa falhou; continuando para a etapa de assets.

call npm run map:export -- "%SRC%\MAPA1.otbm" "%SRC%\exports\map-chunks" 64
if errorlevel 1 echo Aviso: exportador OTBM falhou; verifique a versao do OTBM.

echo.
echo [3/3] Extraindo sprites...
call npm run assets:extract-spr -- "%SRC%\Tibia.spr" "%SRC%\exports\sprites"
if errorlevel 1 echo Aviso: SPR fora da faixa do parser; use ObjectBuilder Studio ou Assets And Map Editor.

echo.
echo Processo finalizado. Consulte a pasta:
echo   %SRC%\exports
echo.
pause
