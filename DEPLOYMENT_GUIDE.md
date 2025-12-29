# WIOF Frontend - Deployment Guide

Complete guide for deploying the WIOF frontend application to Firebase staging and production environments.

## Quick Start

### Staging Deployment (Recommended for Testing)

```bash
chmod +x deploy-staging.sh
./deploy-staging.sh
```

### Production Deployment (Use with Caution)

```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

---

## Prerequisites

### 1. Install Required Tools

```bash
# Node.js and npm
# Visit: https://nodejs.org/ (LTS recommended)

# Angular CLI
npm install -g @angular/cli

# Ionic CLI
npm install -g ionic

# Firebase CLI
npm install -g firebase-tools

# Verify installations
node --version
npm --version
ng version
firebase --version
```

### 2. Firebase Account Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Create two separate projects:
   - One for staging (`wiof-staging`)
   - One for production (`wiof-prod`)
3. Note down the Project IDs and API Keys

### 3. Repository Setup

```bash
# Clone the repository
git clone https://github.com/coding-noddy/wiof-frontend.git
cd wiof-frontend

# Install dependencies
npm install

# Initialize Firebase (if not done before)
firebase init hosting
```

---

## Step-by-Step Deployment Instructions

### Initial Setup (One-Time)

#### Step 1: Create Firebase Projects

1. Visit [Firebase Console](https://console.firebase.google.com/)
2. Create two projects:
   - **Staging**: `wiof-staging` (or similar)
   - **Production**: `wiof-prod` (or similar)
3. For each project:
   - Enable Firestore Database
   - Enable Authentication
   - Enable Cloud Storage

#### Step 2: Configure Firebase CLI

```bash
# Login to Firebase
firebase login

# Initialize Firebase for the project
firebase init hosting

# When prompted:
# - Select your projects
# - Set public directory to: dist
# - Configure as SPA: Yes
# - Set up automatic builds: No (optional)
```

#### Step 3: Set Up Firebase Aliases

```bash
# Create staging alias
firebase use --add
# Select/create staging project
# Name it: staging

# Create production alias
firebase use --add
# Select/create production project
# Name it: production

# List configured projects
firebase projects:list
```

#### Step 4: Create Environment Configuration

Update your environment files:

**`src/environments/environment.ts`** (Development)
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_DEV_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-dev-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_ID",
    appId: "YOUR_APP_ID"
  }
};
```

**`src/environments/environment.staging.ts`** (Staging)
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_STAGING_API_KEY",
    authDomain: "wiof-staging.firebaseapp.com",
    projectId: "wiof-staging",
    storageBucket: "wiof-staging.appspot.com",
    messagingSenderId: "YOUR_STAGING_MESSAGING_ID",
    appId: "YOUR_STAGING_APP_ID"
  }
};
```

**`src/environments/environment.prod.ts`** (Production)
```typescript
export const environment = {
  production: true,
  firebase: {
    apiKey: "YOUR_PROD_API_KEY",
    authDomain: "wiof-prod.firebaseapp.com",
    projectId: "wiof-prod",
    storageBucket: "wiof-prod.appspot.com",
    messagingSenderId: "YOUR_PROD_MESSAGING_ID",
    appId: "YOUR_PROD_APP_ID"
  }
};
```

### Staging Deployment

#### Option A: Using Deployment Script (Recommended)

```bash
chmod +x deploy-staging.sh
./deploy-staging.sh
```

The script will:
- Clean previous builds
- Install dependencies (if needed)
- Build for staging
- Deploy to Firebase staging
- Display the live URL

#### Option B: Manual Deployment

```bash
# Step 1: Build for staging
ng build --configuration staging

# Step 2: Deploy to Firebase
firebase use staging
firebase deploy --only hosting
```

#### Verify Staging Deployment

```bash
# View deployment history
firebase hosting:channel:list --project=staging

# View live URL
firebase hosting:sites:list --project=staging
```

---

### Production Deployment

#### Option A: Using Deployment Script (Recommended)

```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

The script will:
- Request confirmation (with security prompts)
- Verify Firebase authentication
- Clean previous builds
- Install dependencies (if needed)
- Run tests and linting
- Build for production
- Request final confirmation
- Deploy to Firebase production
- Display the live URL

#### Option B: Manual Deployment

```bash
# Step 1: Build for production
ng build --configuration production

# Step 2: Switch to production Firebase project
firebase use production

# Step 3: Deploy to Firebase
firebase deploy --only hosting

# Step 4: Verify deployment
firebase hosting:channel:list --project=production
```

---

## Advanced Deployment Scenarios

### Deploy to Specific Hosting Target

```bash
# If you have multiple hosting targets configured
firebase deploy --only hosting:staging
firebase deploy --only hosting:production
```

### Deploy with Preview Channels (CI/CD Friendly)

```bash
# Create a preview channel
firebase hosting:channel:deploy preview-123 --project=staging

# View preview URL
firebase hosting:channel:list --project=staging
```

### Rollback to Previous Deployment

```bash
# View deployment history
firebase hosting:releases:list --project=production

# Rollback to a specific release
firebase hosting:clone production:main staging:main

# Or force redeploy
firebase deploy --only hosting --project=production --force
```

### Monitor Deployment

```bash
# View real-time deployment logs
firebase hosting:log --project=production --limit=50

# View analytics
firebase hosting:sites:get-config production
```

---

## Troubleshooting

### Firebase Authentication Issues

```bash
# Clear authentication
firebase logout

# Re-authenticate
firebase login

# Verify authentication
firebase projects:list
```

### Build Errors

```bash
# Clear Angular CLI cache
ng cache clean

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Retry build
ng build --configuration production
```

### Firebase Project Not Found

```bash
# List available projects
firebase projects:list

# Use a specific project
firebase use <PROJECT_ID>

# Set default project
firebase use --add
```

### Deployment Fails

```bash
# Check Firebase hosting quota
firebase projects:describe

# Check Firebase project status
firebase status

# Try deployment with verbose logging
firebase deploy --debug
```

### Stuck Deployment

```bash
# Force deployment (use with caution)
firebase deploy --force

# Or clear hosting and redeploy
firebase hosting:releases:list
firebase deploy --only hosting
```

---

## Environment Variables

Create a `.env` file (do NOT commit to Git):

```bash
FIREBASE_STAGING_PROJECT=wiof-staging
FIREBASE_PROD_PROJECT=wiof-prod
STAGING_URL=https://wiof-staging.firebaseapp.com
PROD_URL=https://wiof-prod.firebaseapp.com
```

Add to `.gitignore`:

```bash
.env
.env.local
*.env
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches:
      - main
      - develop

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: wiof-prod
```

---

## Security Best Practices

1. **Never commit secrets**: Use environment variables for API keys
2. **Use service accounts**: For automated deployments
3. **Restrict Firebase rules**: Follow principle of least privilege
4. **Enable authentication**: Protect admin features
5. **Regular backups**: Export Firestore data regularly
6. **Monitor deployments**: Set up alerts for failed deploys

---

## Useful Firebase Commands

```bash
# List all Firebase projects
firebase projects:list

# Get project details
firebase projects:describe PROJECT_ID

# View hosting sites
firebase hosting:sites:list

# View deployment history
firebase hosting:releases:list --project=PROJECT_ID

# View real-time logs
firebase hosting:log --project=PROJECT_ID

# Test Firebase setup
firebase deploy --dry-run

# View Firebase config
firebase use
```

---

## Support & Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Angular Documentation](https://angular.io/docs)
- [Ionic Documentation](https://ionicframework.com/docs)
- [Firebase Hosting Guide](https://firebase.google.com/docs/hosting)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

---

## Troubleshooting Checklist

- [ ] Firebase CLI installed and logged in
- [ ] Node.js and npm installed
- [ ] Environment files configured
- [ ] Firebase projects created
- [ ] Firebase aliases set up
- [ ] `.firebaserc` file exists
- [ ] `dist/` folder exists after build
- [ ] Sufficient Firebase quota
- [ ] Firebase rules configured correctly
- [ ] Domain/SSL configured (if custom domain)

---

**Last Updated**: December 2025

For questions or issues, please open a GitHub issue in the repository.
