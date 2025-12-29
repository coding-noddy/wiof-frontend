# Quick Start Guide - WIOF Frontend Deployment

**Last Updated**: December 4, 2025

## What's New?

This project now includes complete deployment infrastructure for Firebase staging and production environments.

### 📁 New Files Added

1. **README.md** - Comprehensive project documentation with full setup instructions
2. **DEPLOYMENT_GUIDE.md** - Detailed deployment guide with step-by-step instructions
3. **deploy-staging.sh** - Automated script for deploying to Firebase staging
4. **deploy-production.sh** - Automated script for deploying to Firebase production (with safety prompts)
5. **wiof.sh** - Utility helper script for common development commands
6. **.firebaserc.template** - Firebase configuration template

---

## ⚡ Quick Start (5 minutes)

### 1. Prerequisites

```bash
# Install Node.js, npm, and global tools (if not already installed)
npm install -g @angular/cli ionic firebase-tools

# Verify installations
node --version  # v14+
npm --version   # v6+
ng version      # 13+
firebase --version  # 9+
```

### 2. Setup Project

```bash
# Install dependencies
npm install

# Login to Firebase
firebase login

# Initialize Firebase (one-time setup)
firebase init hosting
firebase use --add  # Set up staging and production aliases
```

### 3. Deploy

#### To Staging (Recommended First):
```bash
./deploy-staging.sh
```

#### To Production:
```bash
./deploy-production.sh
```

---

## 🎯 Available Commands

### Using Deployment Scripts (Recommended)

```bash
# Deploy to Staging
./deploy-staging.sh

# Deploy to Production
./deploy-production.sh
```

### Using Helper Commands

```bash
# Show all available commands
./wiof.sh help

# Common commands
./wiof.sh start              # Start dev server
./wiof.sh build:prod         # Build for production
./wiof.sh deploy:staging     # Deploy to staging
./wiof.sh deploy:prod        # Deploy to production
./wiof.sh test               # Run tests
./wiof.sh lint               # Run linting
```

### Manual Commands

```bash
# Development
npm start                           # Start dev server
ng build                           # Dev build
ng build --configuration staging   # Staging build
ng build --configuration production # Prod build

# Testing
npm test                           # Unit tests
npm run lint                       # Linting
npm run e2e                        # E2E tests

# Firebase
firebase login                     # Login to Firebase
firebase projects:list            # List projects
firebase deploy --project=staging  # Manual deployment
```

---

## 🔧 One-Time Firebase Setup

### Step 1: Create Firebase Projects

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create two projects:
   - `wiof-staging` (for testing)
   - `wiof-prod` (for production)

### Step 2: Configure Firebase CLI

```bash
firebase login
firebase use --add

# Select staging project first, name it "staging"
# Select production project, name it "production"
```

### Step 3: Copy Firebase Configuration

Update your environment files with your Firebase config:

**`src/environments/environment.ts`**:
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_DEV_KEY",
    authDomain: "dev-project.firebaseapp.com",
    projectId: "dev-project",
    // ... other config
  }
};
```

**`src/environments/environment.prod.ts`**:
```typescript
export const environment = {
  production: true,
  firebase: {
    apiKey: "YOUR_PROD_KEY",
    authDomain: "wiof-prod.firebaseapp.com",
    projectId: "wiof-prod",
    // ... other config
  }
};
```

---

## 📋 Deployment Workflow

### Staging Deployment (Recommended for Testing)

```bash
./deploy-staging.sh
```

**What it does**:
- ✅ Cleans previous builds
- ✅ Installs dependencies (if needed)
- ✅ Builds for staging configuration
- ✅ Deploys to Firebase staging
- ✅ Shows live URL

### Production Deployment (Use with Caution!)

```bash
./deploy-production.sh
```

**What it does**:
- ✅ Requests initial confirmation
- ✅ Verifies Firebase authentication
- ✅ Cleans builds
- ✅ Installs dependencies (if needed)
- ✅ Runs tests and linting
- ✅ Builds for production
- ✅ Requests final confirmation before deploying
- ✅ Deploys to Firebase production
- ✅ Shows live URL

---

## 🚀 Common Workflows

### First-Time Deployment

```bash
# 1. Setup dependencies
npm install

# 2. Login to Firebase
firebase login

# 3. Initialize Firebase
firebase init hosting

# 4. Add project aliases
firebase use --add
# Select staging project, name it "staging"
firebase use --add
# Select production project, name it "production"

# 5. Deploy to staging first
./deploy-staging.sh

# 6. Test staging
# Visit the provided URL

# 7. When ready, deploy to production
./deploy-production.sh
```

### Update and Redeploy to Staging

```bash
# 1. Make your changes
# 2. Test locally
npm start

# 3. Deploy to staging
./deploy-staging.sh

# 4. Test in staging environment
# 5. When ready, deploy to production
./deploy-production.sh
```

### Quick Redeploy

```bash
# If you only need to rebuild and deploy
./deploy-staging.sh   # for testing
./deploy-production.sh # for live
```

---

## 📊 Check Deployment Status

```bash
# View live projects
firebase projects:list

# Check currently selected project
firebase use

# View deployment history
firebase hosting:releases:list --project=staging
firebase hosting:releases:list --project=production

# View deployment logs
firebase hosting:log --project=staging
firebase hosting:log --project=production
```

---

## ⚠️ Important Notes

1. **Always test in staging first** before deploying to production
2. **The production script has safety prompts** to prevent accidental deployments
3. **Environment files must be configured** with your Firebase project details
4. **Never commit Firebase secrets** to the repository
5. **Use `.env` files** for sensitive configuration (add to `.gitignore`)

---

## 🔐 Security Checklist

- [ ] Created separate Firebase projects for staging and production
- [ ] Configured Firebase CLI with `firebase login`
- [ ] Set up project aliases with `firebase use --add`
- [ ] Updated environment configuration files
- [ ] Tested locally with `npm start`
- [ ] Tested deployment with `./deploy-staging.sh`
- [ ] Verified staging deployment works
- [ ] Ready for production deployment

---

## 📚 Documentation

For more detailed information, see:

- **[README.md](./README.md)** - Complete project documentation
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Comprehensive deployment guide
- **[Firebase Documentation](https://firebase.google.com/docs/hosting)**
- **[Angular Documentation](https://angular.io/docs)**

---

## ❓ Troubleshooting

### Firebase login fails
```bash
firebase logout
firebase login
```

### Build errors
```bash
ng cache clean
rm -rf node_modules package-lock.json
npm install
ng build --configuration production
```

### Deployment fails
```bash
firebase deploy --debug
firebase projects:list
firebase use  # Check current project
```

### Can't find deployment scripts
```bash
chmod +x deploy-*.sh wiof.sh
./deploy-staging.sh
```

---

## 💬 Support

For issues or questions:
1. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
2. Review [Firebase Docs](https://firebase.google.com/docs)
3. Open a GitHub issue

---

**Happy Deploying! 🚀**
