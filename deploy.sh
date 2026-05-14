#!/bin/bash

# ============================================
# UHQ Accounts - VPS Deployment Script
# Run this script directly on your VPS
# ============================================

set -e  # Exit on any error

# ============================================
# Configuration
# ============================================

# Deployment Options
DEPLOY_BACKEND=${DEPLOY_BACKEND:-true}
DEPLOY_FRONTEND=${DEPLOY_FRONTEND:-true}
RUN_MIGRATIONS=${RUN_MIGRATIONS:-false}  # Set to true if you want to run DB migrations
RUN_SEED_FIRST_ADMIN=${RUN_SEED_FIRST_ADMIN:-false}  # Set to true to seed/update superadmin user
RESTART_NGINX=${RESTART_NGINX:-true}

# Project path on VPS
PROJECT_PATH="~/Uhqaccounts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================
# Functions
# ============================================

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# ============================================
# Main Deployment
# ============================================

echo "============================================"
echo "  UHQ Accounts - Deployment Script"
echo "============================================"
echo ""

# Expand tilde in path
PROJECT_PATH="${PROJECT_PATH/#\~/$HOME}"
cd "$PROJECT_PATH" || {
    print_error "Failed to change directory to $PROJECT_PATH"
    exit 1
}

print_success "Working directory: $(pwd)"

# Ensure shared external network exists (both compose files expect external)
print_info "Ensuring Docker network exists..."
docker network inspect uhq-network >/dev/null 2>&1 || docker network create uhq-network >/dev/null

# Deploy Backend
if [ "$DEPLOY_BACKEND" = true ]; then
    echo ""
    print_info "Deploying Backend..."
    cd backend
    
    # Rebuild and restart backend
    print_info "Rebuilding backend containers..."
    docker compose down
    docker compose up -d --build
    
    # Wait for services to be healthy
    print_info "Waiting for services to be healthy..."
    sleep 5
    
    # Run migrations if needed
    if [ "$RUN_MIGRATIONS" = true ]; then
        print_info "Running database migrations..."
        docker exec uhq-backend bun run db:generate
        docker exec uhq-backend bun run db:push
    fi

    # Seed first admin if needed
    if [ "$RUN_SEED_FIRST_ADMIN" = true ]; then
        print_info "Seeding first admin (superadmin@uhq.com)..."
        docker exec uhq-backend bun run src/scripts/create-first-admin.ts
        print_success "First admin seed completed"
    fi
    
    print_success "Backend deployed successfully"
    cd ..
fi

# Deploy Frontend
if [ "$DEPLOY_FRONTEND" = true ]; then
    echo ""
    print_info "Deploying Frontend..."
    cd frontend
    
    # Rebuild and restart frontend
    print_info "Rebuilding frontend container..."
    docker compose down
    docker compose up -d --build
    
    print_success "Frontend deployed successfully"
    cd ..
fi

# Restart Nginx if needed
if [ "$RESTART_NGINX" = true ]; then
    echo ""
    print_info "Restarting Nginx..."
    systemctl restart nginx
    print_success "Nginx restarted"
fi

# Check service status
echo ""
echo "============================================"
echo "  Service Status"
echo "============================================"

echo ""
echo "Docker Containers:"
echo ""
echo "Backend:"
cd backend && docker compose ps && cd ..
echo ""
echo "Frontend:"
cd frontend && docker compose ps && cd ..

echo ""
echo "Nginx Status:"
systemctl status nginx --no-pager -l | head -10

echo ""
echo "============================================"
echo "  Deployment Complete!"
echo "============================================"
echo ""
print_success "Deployment completed successfully!"
echo ""
echo "Your application should now be live at:"
echo "  - Frontend: https://uhqaccounts.com"
echo "  - API: https://api.uhqaccounts.com"
echo ""
