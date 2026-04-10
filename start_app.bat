@echo off
title Chrono Development
cd /d "%~dp0"
echo Starting Chrono Development...
echo.
echo The app will open in your browser at http://localhost:5173
echo.
start "" http://localhost:5173
npm run dev
