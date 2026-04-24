#!/bin/bash

# AI Bail Bond Risk Assessor - Startup Script
# =============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════╗"
echo "║      AI Bail Bond Risk Assessor Platform         ║"
echo "║          Starting Application...                 ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
  echo -e "${RED}✗ .env file not found! Please create one.${NC}"
  exit 1
fi

SERVER_PORT=${SERVER_PORT:-3001}
CLIENT_PORT=${CLIENT_PORT:-3000}

# Function to kill processes on specific ports
cleanup_ports() {
  echo -e "${YELLOW}→ Cleaning up ports ${SERVER_PORT} and ${CLIENT_PORT}...${NC}"

  for PORT in $SERVER_PORT $CLIENT_PORT; do
    PID=$(lsof -ti:$PORT 2>/dev/null || true)
    if [ -n "$PID" ]; then
      echo -e "${YELLOW}  Killing process on port $PORT (PID: $PID)${NC}"
      kill -9 $PID 2>/dev/null || true
      sleep 1
    fi
  done

  echo -e "${GREEN}✓ Ports cleaned${NC}"
}

# Function to check if PostgreSQL is running
check_postgres() {
  echo -e "${YELLOW}→ Checking PostgreSQL...${NC}"
  if command -v pg_isready &> /dev/null; then
    if pg_isready -q; then
      echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    else
      echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
      if command -v brew &> /dev/null; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
      fi
      sleep 2
      if pg_isready -q; then
        echo -e "${GREEN}✓ PostgreSQL started${NC}"
      else
        echo -e "${RED}✗ Could not start PostgreSQL. Please start it manually.${NC}"
        exit 1
      fi
    fi
  else
    echo -e "${YELLOW}  pg_isready not found, assuming PostgreSQL is running${NC}"
  fi
}

# Function to setup database
setup_database() {
  echo -e "${YELLOW}→ Setting up database...${NC}"
  node server/setup-db.js
  echo -e "${GREEN}✓ Database tables created${NC}"
}

# Function to seed data
seed_data() {
  echo -e "${YELLOW}→ Seeding data into database...${NC}"
  node server/seed.js
  echo -e "${GREEN}✓ Data seeded successfully${NC}"
}

# Function to install dependencies
install_deps() {
  echo -e "${YELLOW}→ Checking dependencies...${NC}"

  if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}  Installing server dependencies...${NC}"
    npm install
  else
    echo -e "${GREEN}  Server dependencies already installed${NC}"
  fi

  if [ ! -d "client/node_modules" ]; then
    echo -e "${CYAN}  Installing client dependencies...${NC}"
    cd client && npm install && cd ..
  else
    echo -e "${GREEN}  Client dependencies already installed${NC}"
  fi

  echo -e "${GREEN}✓ All dependencies ready${NC}"
}

# Cleanup function for graceful shutdown
cleanup() {
  echo -e "\n${YELLOW}→ Shutting down...${NC}"
  kill $(jobs -p) 2>/dev/null || true
  echo -e "${GREEN}✓ Application stopped${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Main execution
cleanup_ports
check_postgres
install_deps
setup_database
seed_data

echo ""
echo -e "${PURPLE}╔══════════════════════════════════════════════════╗"
echo -e "║            Starting Application                 ║"
echo -e "╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Start server with nodemon for hot reload
echo -e "${CYAN}→ Starting backend server on port ${SERVER_PORT} (with hot reload)...${NC}"
npx nodemon --watch server server/index.js &

# Start React client with hot reload (built-in)
echo -e "${CYAN}→ Starting frontend on port ${CLIENT_PORT} (with hot reload)...${NC}"
cd client && PORT=$CLIENT_PORT npx react-scripts start &

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗"
echo -e "║  Application is starting!                        ║"
echo -e "║                                                  ║"
echo -e "║  Frontend:  http://localhost:${CLIENT_PORT}               ║"
echo -e "║  Backend:   http://localhost:${SERVER_PORT}               ║"
echo -e "║                                                  ║"
echo -e "║  Demo Login:                                     ║"
echo -e "║    Email:    admin@bailbond.com                   ║"
echo -e "║    Password: admin123                             ║"
echo -e "║                                                  ║"
echo -e "║  Hot reload enabled - changes auto-refresh!      ║"
echo -e "║  Press Ctrl+C to stop                            ║"
echo -e "╚══════════════════════════════════════════════════╝${NC}"
echo ""

# Wait for all background processes
wait
