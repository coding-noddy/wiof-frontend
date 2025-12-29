# WIOF - World is One Family

A comprehensive Angular/Ionic-based web application built with Firebase integration, featuring content management for blogs, videos, environmental tracking, and community engagement.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Building](#building)
- [Deployment](#deployment)
  - [Firebase Setup](#firebase-setup)
  - [Staging Deployment](#staging-deployment)
  - [Production Deployment](#production-deployment)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Technology Stack](#technology-stack)
- [Contributing](#contributing)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (v6 or higher) or **yarn**
- **Angular CLI** (v13 or higher)
- **Ionic CLI** (v6 or higher)
- **Firebase CLI** (v9 or higher)
- **Git**

Verify installations:

```bash
node --version
npm --version
ng version
ionic --version
firebase --version
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/coding-noddy/wiof-frontend.git
cd wiof-frontend
```

### 2. Install Dependencies

```bash
npm install
```

Or if using yarn:

```bash
yarn install
```

### 3. Configure Firebase

Create a `src/environments/firebase.config.ts` file with your Firebase configuration:

```typescript
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Update `src/environments/environment.ts` and `src/environments/environment.prod.ts` with your configurations for different environments.

## Development

### Start Development Server

```bash
npm start
```

The application will be available at `http://localhost:4200`

### Run Tests

```bash
npm test
```

### Run Linting

```bash
npm run lint
```

### Run E2E Tests

```bash
npm run e2e
```

## Building

### Build for Development

```bash
ng build
```

### Build for Production

```bash
ng build --configuration production
```

The build artifacts will be stored in the `dist/` directory.

## Deployment

### Firebase Setup

#### 1. Initialize Firebase Project (First Time Only)

If you haven't initialized Firebase for this project yet:

```bash
firebase init
```

Select the following options:
- Hosting (use spacebar to select)
- Use existing project or create a new one
- Select your Firebase project
- Set public directory to: `dist`
- Configure as single-page app: `Yes`
- Set up automatic builds with GitHub: `No` (optional)

#### 2. Login to Firebase

```bash
firebase login
```

This will open a browser window to authenticate with your Firebase account.

#### 3. Set Default Project

```bash
firebase use --add
```

Select your Firebase project and assign an alias (e.g., `staging`, `production`).

### Staging Deployment

#### Manual Staging Deployment

```bash
# Build for staging
ng build --configuration staging

# Deploy to staging Firebase project
firebase deploy --project=staging
```

#### Automated Staging Script

Create `deploy-staging.sh`:

```bash
#!/bin/bash

echo "🚀 Building for Staging..."
ng build --configuration staging

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🔥 Deploying to Firebase Staging..."
    firebase deploy --project=staging
    
    if [ $? -eq 0 ]; then
        echo "✅ Staging deployment successful!"
        echo "🌐 Your app is now live at: https://wiof-staging.firebaseapp.com"
    else
        echo "❌ Staging deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
```

Make it executable:

```bash
chmod +x deploy-staging.sh
```

Run it:

```bash
./deploy-staging.sh
```

### Production Deployment

#### Manual Production Deployment

```bash
# Build for production
ng build --configuration production

# Deploy to production Firebase project
firebase deploy --project=production
```

#### Automated Production Script

Create `deploy-production.sh`:

```bash
#!/bin/bash

echo "⚠️  WARNING: You are about to deploy to PRODUCTION"
echo "Press Ctrl+C to cancel or Enter to continue..."
read

echo "🚀 Building for Production..."
ng build --configuration production

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "🔥 Deploying to Firebase Production..."
    firebase deploy --project=production
    
    if [ $? -eq 0 ]; then
        echo "✅ Production deployment successful!"
        echo "🌐 Your app is now live at: https://wiof-prod.firebaseapp.com"
    else
        echo "❌ Production deployment failed!"
        exit 1
    fi
else
    echo "❌ Build failed!"
    exit 1
fi
```

Make it executable:

```bash
chmod +x deploy-production.sh
```

Run it:

```bash
./deploy-production.sh
```

### Deploy Specific Hosting Target (Optional)

If you have multiple hosting targets configured:

```bash
# Deploy to specific target
firebase deploy --only hosting:staging

firebase deploy --only hosting:production
```

### Rollback a Deployment

```bash
firebase deploy --project=production --force
```

To view deployment history:

```bash
firebase hosting:channel:list --project=production
```

## Project Structure

```
wiof-frontend/
├── src/
│   ├── app/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── services/            # Angular services
│   │   ├── models/              # TypeScript interfaces/models
│   │   ├── guards/              # Route guards
│   │   └── app.module.ts        # Main app module
│   ├── assets/                  # Static assets (images, icons, etc.)
│   ├── environments/            # Environment-specific configs
│   ├── theme/                   # SCSS theme variables
│   ├── index.html               # Main HTML file
│   └── main.ts                  # Application entry point
├── dist/                        # Build output directory
├── angular.json                 # Angular CLI configuration
├── firebase.json                # Firebase hosting configuration
├── ionic.config.json            # Ionic configuration
├── package.json                 # Project dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server |
| `npm run build` | Build for production |
| `npm test` | Run unit tests |
| `npm run lint` | Run TypeScript linting |
| `npm run e2e` | Run end-to-end tests |
| `./deploy-staging.sh` | Deploy to Firebase staging |
| `./deploy-production.sh` | Deploy to Firebase production |

## Technology Stack

- **Framework**: Angular 13.1.1
- **UI Framework**: Ionic 6.0.1
- **Styling**: SCSS
- **Charts**: D3.js
- **Rich Text Editor**: Quill
- **Backend**: Firebase
- **Authentication**: Firebase Authentication
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Testing**: Jasmine/Karma

## Troubleshooting

### Firebase Login Issues

```bash
firebase logout
firebase login
```

### Clear Node Modules and Reinstall

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

1. Clear Angular cache:
   ```bash
   ng cache clean
   ```

2. Rebuild:
   ```bash
   ng build --configuration production
   ```

### Firebase Deployment Issues

Check Firebase project status:

```bash
firebase projects:list
firebase use
```

View deployment logs:

```bash
firebase hosting:log --project=production
```

## Environment Configuration

### Development Environment (`environment.ts`)

Used for local development with `ng serve`.

### Production Environment (`environment.prod.ts`)

Used when building with `--configuration production`.

Update these files with your Firebase project IDs and API keys for different environments.

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests: `npm test`
4. Run linting: `npm run lint`
5. Push your changes
6. Create a Pull Request

## License

This project is part of the World is One Family (WIOF) initiative.

---

**Need Help?**

- Check the [Angular Documentation](https://angular.io/docs)
- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Check the [Ionic Documentation](https://ionicframework.com/docs)

**Last Updated**: December 2025