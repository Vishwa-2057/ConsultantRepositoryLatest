@echo off
echo Starting Healthcare Management System...
echo.

echo Starting Backend Server...
start "Backend Server" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Both servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:8080
echo.
echo Press any key to run connection test...
pause >nul

node test-connection.js

echo.
echo Press any key to exit...
pause >nul
