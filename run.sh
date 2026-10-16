#!/usr/bin/env bash
# ==============================================================================
# Bangladesh Real Estate Enterprise ERP - 1-Click Startup Script (Linux / macOS)
# ==============================================================================

set -e

# ANSI Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
AMBER='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo -e "${CYAN}${BOLD}"
echo "==================================================================="
echo "   🏢 BANGLADESH REAL ESTATE ENTERPRISE ERP - 1-CLICK LAUNCHER     "
echo "==================================================================="
echo -e "${NC}"

# Cleanup handler on exit or Ctrl+C
cleanup() {
    echo -e "\n${AMBER}🛑 Shutting down services...${NC}"
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        echo -e "${AMBER}Stopping Backend (PID: $BACKEND_PID)...${NC}"
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        echo -e "${AMBER}Stopping Frontend (PID: $FRONTEND_PID)...${NC}"
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}✓ All services stopped gracefully.${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Check Python & Virtualenv
echo -e "${BLUE}▶ Checking Backend Environment...${NC}"
if [ -f "$BACKEND_DIR/venv/bin/python" ]; then
    PYTHON_CMD="$BACKEND_DIR/venv/bin/python"
elif [ -f "$ROOT_DIR/venv/bin/python" ]; then
    PYTHON_CMD="$ROOT_DIR/venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo -e "${RED}❌ Python not found! Please install Python 3.10+.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python found:${NC} $($PYTHON_CMD --version)"

# 2. Check Node & NPM
echo -e "${BLUE}▶ Checking Frontend Environment...${NC}"
if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}❌ Node.js / NPM not found! Please install Node.js 18+.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ NPM found:${NC} v$(npm --version)"

# 3. Check port conflicts
check_and_free_port() {
    local port=$1
    local name=$2
    local pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo -e "${AMBER}Notice: Port $port ($name) is currently used by PID $pid.${NC}"
    fi
}
check_and_free_port 8000 "Backend"
check_and_free_port 4200 "Frontend"

# 4. Start Backend Service
echo -e "\n${CYAN}▶ [1/2] Starting FastAPI Backend on http://localhost:8000 ...${NC}"
cd "$BACKEND_DIR"
$PYTHON_CMD -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend launched with PID: $BACKEND_PID${NC}"

# Wait up to 5 seconds for backend to start responding
for i in {1..10}; do
    if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is healthy and ready!${NC}"
        break
    fi
    sleep 0.5
done

# 5. Start Frontend Service
echo -e "\n${CYAN}▶ [2/2] Starting Angular Frontend on http://localhost:4200 ...${NC}"
cd "$FRONTEND_DIR"
npm start -- --host 0.0.0.0 --port 4200 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend launched with PID: $FRONTEND_PID${NC}"

echo -e "\n${GREEN}${BOLD}===================================================================${NC}"
echo -e "${GREEN}${BOLD}   🎉 SYSTEM IS RUNNING SUCCESSFULLY!                              ${NC}"
echo -e "${GREEN}${BOLD}===================================================================${NC}"
echo -e "${BOLD}▶ Frontend Application :${NC} ${CYAN}http://localhost:4200${NC}"
echo -e "${BOLD}▶ Backend API Docs     :${NC} ${CYAN}http://localhost:8000/docs${NC}"
echo -e "${BOLD}▶ Alternative URL      :${NC} ${CYAN}http://127.0.0.1:4200${NC}"
echo -e "==================================================================="
echo -e "${AMBER}👉 Press Ctrl + C anytime to stop both services.${NC}\n"

# Wait for background processes to keep terminal open
wait
