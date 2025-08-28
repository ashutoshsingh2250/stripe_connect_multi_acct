@echo off
REM 🚀 Stripe Connect Multi-Account Reporting Application - Setup Script (Windows)
REM This script will set up your development environment on Windows

echo 🚀 Setting up Stripe Connect Reporting Application...
echo ==================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% LSS 18 (
    echo ❌ Node.js version 18+ is required. Current version:
    node --version
    echo    Please upgrade Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js version:
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm version:
npm --version

REM Install dependencies
echo.
echo 📦 Installing dependencies...
echo ============================

REM Install root dependencies
echo Installing root dependencies...
call npm install

REM Install client dependencies
echo Installing client dependencies...
cd client
call npm install
cd ..

REM Install server dependencies
echo Installing server dependencies...
cd server-nest
call npm install
cd ..

echo.
echo ✅ All dependencies installed successfully!

REM Create environment file
echo.
echo 🔧 Setting up environment configuration...
echo ========================================

if not exist "server-nest\.env" (
    if exist "server-nest\env.example" (
        copy "server-nest\env.example" "server-nest\.env" >nul
        echo ✅ Created server-nest\.env from env.example
        echo ⚠️  Please edit server-nest\.env with your actual SMTP credentials
    ) else (
        echo ⚠️  env.example not found. Please create server-nest\.env manually
    )
) else (
    echo ✅ server-nest\.env already exists
)

REM Create exports and temp directories
echo.
echo 📁 Creating necessary directories...
if not exist "exports" mkdir exports
if not exist "server-nest\temp" mkdir server-nest\temp
echo ✅ Created exports\ and server-nest\temp\ directories

REM Build the application
echo.
echo 🔨 Building the application...
echo =============================

cd server-nest
call npm run build
cd ..
echo ✅ Backend built successfully!

echo.
echo 🎉 Setup completed successfully!
echo ================================
echo.
echo 📋 Next steps:
echo 1. Edit server-nest\.env with your SMTP credentials
echo 2. Run 'npm run dev' to start development servers
echo 3. Access frontend at: http://localhost:3000
echo 4. Access backend at: http://localhost:5000
echo.
echo 📚 For more information, see README.md
echo.
echo Happy coding! 🚀
pause
