#!/usr/bin/env bash
# ==============================================================================
# Bangladesh Real Estate Enterprise ERP - Stop Services (Linux / macOS)
# ==============================================================================

GREEN='\033[0;32m'
AMBER='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${AMBER}🛑 Stopping Bangladesh Real Estate ERP Services...${NC}"

# Kill processes on port 8000 (Backend)
B_PID=$(lsof -ti :8000 2>/dev/null || true)
if [ -n "$B_PID" ]; then
    echo -e "Stopping Backend on port 8000 (PID: $B_PID)..."
    kill -9 $B_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Backend stopped.${NC}"
else
    echo "No process running on port 8000."
fi

# Kill processes on port 4200 (Frontend)
F_PID=$(lsof -ti :4200 2>/dev/null || true)
if [ -n "$F_PID" ]; then
    echo -e "Stopping Frontend on port 4200 (PID: $F_PID)..."
    kill -9 $F_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Frontend stopped.${NC}"
else
    echo "No process running on port 4200."
fi

echo -e "${GREEN}✓ All ERP services have been stopped.${NC}"
