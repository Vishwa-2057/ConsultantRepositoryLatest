@echo off
echo ========================================
echo Healthcare Management System - TestSprite Test Runner
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Run API Tests with Jest
echo ========================================
echo Running API Tests (Jest)...
echo ========================================
call npm run test:api
set API_TEST_RESULT=%ERRORLEVEL%
echo.

REM Run E2E Tests with Playwright
echo ========================================
echo Running E2E Tests (Playwright)...
echo ========================================
call npm run test:e2e
set E2E_TEST_RESULT=%ERRORLEVEL%
echo.

REM Display Results Summary
echo ========================================
echo Test Results Summary
echo ========================================
if %API_TEST_RESULT%==0 (
    echo API Tests: PASSED
) else (
    echo API Tests: FAILED
)

if %E2E_TEST_RESULT%==0 (
    echo E2E Tests: PASSED
) else (
    echo E2E Tests: FAILED
)
echo.

REM Open test reports
echo Opening test reports...
if exist "test-results\jest-report.html" (
    start test-results\jest-report.html
)
if exist "test-results\playwright-report\index.html" (
    start test-results\playwright-report\index.html
)

echo.
echo ========================================
echo Test execution completed!
echo Check the test-results folder for detailed reports.
echo ========================================
pause
