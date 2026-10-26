@echo off
title IdeaBank
cd /d "%~dp0"
start "" http://localhost:4321
node server.js
pause
