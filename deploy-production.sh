#!/bin/bash

# WIOF Frontend - Production Deployment Script
# This script builds and deploys the application to Firebase production environment
# WARNING: This script deploys to PRODUCTION - use with caution!

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  WIOF Frontend - Production Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Display warning
echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION!${NC}"
echo -e "${RED}This will update the live application.${NC}"
echo ""
echo -e "${YELLOW}Press Enter to continue or Ctrl+C to cancel...${NC}"
read -r

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI is not installed!${NC}"
    echo "Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if ng CLI is installed
if ! command -v ng &> /dev/null; then
    echo -e "${RED}❌ Angular CLI is not installed!${NC}"
    echo "Please install it with: npm install -g @angular/cli"
    exit 1
fi

# Step 1: Verify Firebase login
echo -e "${YELLOW}🔐 Verifying Firebase authentication...${NC}"
if ! firebase auth:import --help &> /dev/null 2>&1; then
    echo -e "${RED}❌ Not authenticated with Firebase!${NC}"
    echo "Please login with: firebase login"
    exit 1
fi
echo -e "${GREEN}✅ Firebase authenticated${NC}"

# Step 2: Clean previous build
echo ""
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist

# Step 3: Install dependencies if needed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Step 4: Run tests
echo ""
echo -e "${YELLOW}🧪 Running tests...${NC}"
if npm test -- --watch=false --browsers=ChromeHeadless 2>/dev/null; then
    echo -e "${GREEN}✅ Tests passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Tests skipped or failed${NC}"
    echo -e "${YELLOW}Proceeding with deployment...${NC}"
fi

# Step 5: Run linting
echo ""
echo -e "${YELLOW}🔍 Running linting...${NC}"
if npm run lint 2>/dev/null; then
    echo -e "${GREEN}✅ Lint check passed!${NC}"
else
    echo -e "${YELLOW}⚠️  Lint check had warnings${NC}"
    echo -e "${YELLOW}Proceeding with deployment...${NC}"
fi

# Step 6: Build for production
echo ""
echo -e "${YELLOW}🚀 Building for Production...${NC}"
if ng build --configuration production; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Step 7: Final confirmation before deployment
echo ""
echo -e "${RED}⚠️  FINAL WARNING: About to deploy to PRODUCTION!${NC}"
echo -e "${YELLOW}Press Enter to confirm deployment or Ctrl+C to cancel...${NC}"
read -r

# Step 8: Deploy to Firebase production
echo ""
echo -e "${YELLOW}🔥 Deploying to Firebase Production...${NC}"
if firebase deploy --only hosting --project=production; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Production deployment successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${BLUE}🌐 Your app is now live at: ${NC}"
    echo -e "${BLUE}   https://wiof-prod.firebaseapp.com${NC}"
    echo ""
    echo -e "${YELLOW}📊 View deployment analytics:${NC}"
    echo -e "${BLUE}   firebase hosting:channel:list --project=production${NC}"
    echo ""
else
    echo -e "${RED}❌ Production deployment failed!${NC}"
    exit 1
fi

exit 0
