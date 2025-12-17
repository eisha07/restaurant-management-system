#!/bin/bash

# Unified Startup Script for Restaurant Management System
# Usage: ./start-all.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project paths
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PATH="$PROJECT_ROOT/restaurant-backend"
FRONTEND_PATH="$PROJECT_ROOT/frontend"

# Function to print colored output
log() {
    local color=$1
    local prefix=$2
    local message=$3
    echo -e "${color}[$(date +'%H:%M:%S')] ${prefix}${NC} ${message}"
}

# Function to cleanup on exit
cleanup() {
    log "$YELLOW" "🛑" "Shutting down servers..."
    jobs -p | xargs -r kill 2>/dev/null
    log "$YELLOW" "⏹️" "All servers stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

clear

# Welcome message
log "$GREEN" "🚀" "================================"
log "$GREEN" "🚀" "Restaurant Management System"
log "$GREEN" "🚀" "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log "$RED" "❌" "Node.js is not installed"
    log "$YELLOW" "⚠️" "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check dependencies
if [ ! -d "$BACKEND_PATH/node_modules" ]; then
    log "$YELLOW" "⚠️" "Backend dependencies not installed"
    log "$CYAN" "ℹ️" "Installing backend dependencies..."
    cd "$BACKEND_PATH"
    npm install
    if [ $? -ne 0 ]; then
        log "$RED" "❌" "Failed to install backend dependencies"
        exit 1
    fi
fi

if [ ! -d "$FRONTEND_PATH/node_modules" ]; then
    log "$YELLOW" "⚠️" "Frontend dependencies not installed"
    log "$CYAN" "ℹ️" "Installing frontend dependencies..."
    cd "$FRONTEND_PATH"
    npm install
    if [ $? -ne 0 ]; then
        log "$RED" "❌" "Failed to install frontend dependencies"
        exit 1
    fi
fi

# Start Backend
log "$BLUE" "📦" "Starting Backend Server..."
log "$CYAN" "ℹ️" "Backend path: $BACKEND_PATH"
log "$CYAN" "ℹ️" "Backend will run on: http://localhost:5000"
echo ""

cd "$BACKEND_PATH"
npm run dev &
BACKEND_PID=$!
sleep 3

# Start Frontend
log "$BLUE" "⚛️" "Starting Frontend Server..."
log "$CYAN" "ℹ️" "Frontend path: $FRONTEND_PATH"
log "$CYAN" "ℹ️" "Frontend will run on: http://localhost:5173"
echo ""

cd "$FRONTEND_PATH"
npm run dev &
FRONTEND_PID=$!

# Display success message
log "$GREEN" "✅" "================================"
log "$GREEN" "✅" "Both servers started successfully!"
log "$GREEN" "✅" "================================"
echo ""

log "$CYAN" "ℹ️" "Backend API: http://localhost:5000/api"
log "$CYAN" "ℹ️" "Frontend: http://localhost:5173"
log "$CYAN" "ℹ️" "Health Check: http://localhost:5000/api/health"
echo ""

log "$YELLOW" "⚠️" "Press Ctrl+C to stop all servers"
log "$YELLOW" "⚠️" "Check the output above for any errors"
echo ""

# Wait for all background processes
wait
