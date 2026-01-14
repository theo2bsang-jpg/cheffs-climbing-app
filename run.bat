@echo off
echo ========================================
echo    Climbing App - Development Server
echo ========================================
echo.

echo Checking for dependencies...
if not exist node_modules (
    echo Installing dependencies...
    npm install
    echo.
)

echo Starting the development server...
echo.
echo The app will be available at: http://localhost:5173
echo Press Ctrl+C to stop the server
echo.
npm run dev