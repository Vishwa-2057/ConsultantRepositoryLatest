@echo off
echo ========================================
echo Quick API Test Runner (TestSprite)
echo ========================================
echo.

REM Run API Tests only
echo Running API Tests...
call npm run test:api

echo.
echo ========================================
echo Opening test report...
echo ========================================
if exist "test-results\jest-report.html" (
    start test-results\jest-report.html
) else (
    echo No test report found.
)

pause
