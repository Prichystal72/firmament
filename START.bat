@echo off
rem Spusti lokalni server a otevre hru v prohlizeci (moduly JS nejdou nacist z file://).
cd /d "%~dp0"
rem server bez mezipameti, aby se po zmene vzdy nacetla nova verze
start "Invaders server" python nastroje\server.py
timeout /t 1 >nul
rem Edge (Chromium) kvuli WebGL a WebAudio
start "" msedge http://127.0.0.1:8093/
