@echo off
cd /d "%~dp0"
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" start "Shinobi no Vale" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0index.html" && exit /b
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" start "Shinobi no Vale" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="file:///%~dp0index.html" && exit /b
start "" "%~dp0index.html"
