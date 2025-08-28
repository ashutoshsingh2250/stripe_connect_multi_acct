#!/bin/bash

# 🚀 Stripe Connect Multi-Account Reporting Application - Setup Script
# This script will set up your development environment

echo "🚀 Setting up Stripe Connect Reporting Application..."
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
    echo "   Please upgrade Node.js from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
echo "============================"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install client dependencies
echo "Installing client dependencies..."
cd client && npm install && cd ..

# Install server dependencies
echo "Installing server dependencies..."
cd server-nest && npm install && cd ..

echo ""
echo "✅ All dependencies installed successfully!"

# Create environment file
echo ""
echo "🔧 Setting up environment configuration..."
echo "========================================"

if [ ! -f "server-nest/.env" ]; then
    if [ -f "server-nest/env.example" ]; then
        cp server-nest/env.example server-nest/.env
        echo "✅ Created server-nest/.env from env.example"
        echo "⚠️  Please edit server-nest/.env with your actual SMTP credentials"
    else
        echo "⚠️  env.example not found. Please create server-nest/.env manually"
    fi
else
    echo "✅ server-nest/.env already exists"
fi

# Create exports and temp directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p exports
mkdir -p server-nest/temp
echo "✅ Created exports/ and server-nest/temp/ directories"

# Build the application
echo ""
echo "🔨 Building the application..."
echo "============================="

cd server-nest && npm run build && cd ..
echo "✅ Backend built successfully!"

echo ""
echo "🎉 Setup completed successfully!"
echo "================================"
echo ""
echo "📋 Next steps:"
echo "1. Edit server-nest/.env with your SMTP credentials"
echo "2. Run 'npm run dev' to start development servers"
echo "3. Access frontend at: http://localhost:3000"
echo "4. Access backend at: http://localhost:5000"
echo ""
echo "📚 For more information, see README.md"
echo ""
echo "Happy coding! 🚀"
