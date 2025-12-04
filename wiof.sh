#!/bin/bash

# WIOF Frontend - Utility Commands Helper
# Quick commands for common development tasks

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Display help menu
show_help() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  WIOF Frontend - Quick Commands${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${GREEN}Development:${NC}"
    echo "  ./wiof.sh start              - Start development server"
    echo "  ./wiof.sh build              - Build for development"
    echo "  ./wiof.sh test               - Run unit tests"
    echo "  ./wiof.sh lint               - Run linting"
    echo "  ./wiof.sh e2e                - Run end-to-end tests"
    echo ""
    echo -e "${GREEN}Production Builds:${NC}"
    echo "  ./wiof.sh build:prod         - Build for production"
    echo "  ./wiof.sh build:staging      - Build for staging"
    echo ""
    echo -e "${GREEN}Deployment:${NC}"
    echo "  ./wiof.sh deploy:staging     - Deploy to Firebase staging"
    echo "  ./wiof.sh deploy:prod        - Deploy to Firebase production"
    echo ""
    echo -e "${GREEN}Firebase:${NC}"
    echo "  ./wiof.sh firebase:login     - Login to Firebase"
    echo "  ./wiof.sh firebase:status    - Check Firebase status"
    echo "  ./wiof.sh firebase:projects  - List Firebase projects"
    echo ""
    echo -e "${GREEN}Utilities:${NC}"
    echo "  ./wiof.sh clean              - Clean builds and cache"
    echo "  ./wiof.sh reinstall          - Reinstall dependencies"
    echo "  ./wiof.sh help               - Show this help message"
    echo ""
}

# Start development server
start_dev() {
    echo -e "${YELLOW}🚀 Starting development server...${NC}"
    npm start
}

# Build for development
build_dev() {
    echo -e "${YELLOW}🔨 Building for development...${NC}"
    ng build
}

# Build for production
build_prod() {
    echo -e "${YELLOW}🔨 Building for production...${NC}"
    ng build --configuration production
}

# Build for staging
build_staging() {
    echo -e "${YELLOW}🔨 Building for staging...${NC}"
    ng build --configuration staging
}

# Run tests
run_tests() {
    echo -e "${YELLOW}🧪 Running unit tests...${NC}"
    npm test
}

# Run linting
run_lint() {
    echo -e "${YELLOW}🔍 Running linting...${NC}"
    npm run lint
}

# Run e2e tests
run_e2e() {
    echo -e "${YELLOW}🧪 Running end-to-end tests...${NC}"
    npm run e2e
}

# Deploy to staging
deploy_staging() {
    echo -e "${YELLOW}📦 Deploying to Firebase staging...${NC}"
    ./deploy-staging.sh
}

# Deploy to production
deploy_prod() {
    echo -e "${YELLOW}📦 Deploying to Firebase production...${NC}"
    ./deploy-production.sh
}

# Firebase login
firebase_login() {
    echo -e "${YELLOW}🔐 Logging into Firebase...${NC}"
    firebase login
}

# Firebase status
firebase_status() {
    echo -e "${YELLOW}📊 Firebase status...${NC}"
    firebase status
}

# List Firebase projects
firebase_projects() {
    echo -e "${YELLOW}📋 Firebase projects...${NC}"
    firebase projects:list
}

# Clean builds and cache
clean_all() {
    echo -e "${YELLOW}🧹 Cleaning builds and cache...${NC}"
    rm -rf dist
    rm -rf .angular
    ng cache clean
    echo -e "${GREEN}✅ Cleaned!${NC}"
}

# Reinstall dependencies
reinstall_deps() {
    echo -e "${YELLOW}📦 Reinstalling dependencies...${NC}"
    rm -rf node_modules package-lock.json
    npm install
    echo -e "${GREEN}✅ Dependencies installed!${NC}"
}

# Main script
case "${1}" in
    start)
        start_dev
        ;;
    build)
        build_dev
        ;;
    build:prod)
        build_prod
        ;;
    build:staging)
        build_staging
        ;;
    test)
        run_tests
        ;;
    lint)
        run_lint
        ;;
    e2e)
        run_e2e
        ;;
    deploy:staging)
        deploy_staging
        ;;
    deploy:prod)
        deploy_prod
        ;;
    firebase:login)
        firebase_login
        ;;
    firebase:status)
        firebase_status
        ;;
    firebase:projects)
        firebase_projects
        ;;
    clean)
        clean_all
        ;;
    reinstall)
        reinstall_deps
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: ${1}${NC}"
        show_help
        exit 1
        ;;
esac
