@echo off
echo ========================================
echo KHIDMA Frontend - Development Server
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo Starting development server...
echo Frontend will be available at: http://localhost:5173
echo Backend should be running at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
