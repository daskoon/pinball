@echo off
title NES Pinball 1984 - Launcher
echo Starting NES Pinball 1984 Local Arcade Server...
start "" "http://localhost:8080/index.html"
python -m http.server 8080
pause
