@echo off
echo Launching YY-CHR (NES Tile / Pixel Editor)...
cd /d "%~dp0tools\yychr"
start "" "YYCHR.exe" "%~dp0Pinball_Mario_Hack.nes"
