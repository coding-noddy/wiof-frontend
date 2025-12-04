#!/bin/bash

# WIOF Frontend - Staging Deployment Script
# This script builds and deploys the application to Firebase staging environment

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  WIOF Frontend - Staging Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

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

# Step 1: Clean previous build
echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
rm -rf dist

# Step 2: Install dependencies if needed
echo -e "${YELLOW}📦 Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Step 3: Build for staging
echo ""
echo -e "${YELLOW}🚀 Building for Staging...${NC}"
if ng build --configuration staging; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Step 4: Deploy to Firebase staging
echo ""
echo -e "${YELLOW}🔥 Deploying to Firebase Staging...${NC}"
if firebase deploy --only hosting --project=staging; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Staging deployment successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${BLUE}🌐 Your app is now live at: ${NC}"
    echo -e "${BLUE}   https://wiof-staging.firebaseapp.com${NC}"
    echo ""
else
    echo -e "${RED}❌ Staging deployment failed!${NC}"
    exit 1
fi

exit 0
