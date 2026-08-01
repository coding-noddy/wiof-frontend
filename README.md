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

### Prerequisites

- Firebase CLI logged in: `firebase login`
- Angular CLI available: `npx ng version`
- Correct Firebase projects in `.firebaserc`

### Quick Deploy (Recommended)

Use the unified PowerShell deploy script:

```powershell
# Deploy to STAGING
.\deploy.ps1 -Target staging

# Deploy to PRODUCTION (requires confirmation)
.\deploy.ps1 -Target prod

# Deploy from current branch (skip release branch creation)
.\deploy.ps1 -Target staging -SkipBranch
```

### What the script does:

1. **Creates release branch** — `release-{version}` from `package.json` version
2. **Cleans** previous `dist/` build
3. **Installs** dependencies if `node_modules` is missing
4. **Builds** — `ng build` for staging, `ng build --configuration production` for prod
5. **Deploys** — `firebase deploy --only hosting --project wiof-staging|wiof-production`
6. **Tags** — creates git tag `v{version}-staging` or `v{version}-prod`

### Firebase Projects

| Alias | Project ID | URL |
|-------|-----------|-----|
| staging | wiof-staging | https://wiof-staging.web.app |
| prod | wiof-production | https://wiof-production.web.app |

### Manual Deploy (if needed)

```powershell
# Staging
npx ng build
firebase deploy --only hosting --project wiof-staging

# Production
npx ng build --configuration production
firebase deploy --only hosting --project wiof-production
```

### Release Process

1. Ensure all changes are committed to `master`
2. Update version in `package.json` if needed
3. Run `.\deploy.ps1 -Target staging` — test on staging
4. Verify staging works at https://wiof-staging.web.app
5. Run `.\deploy.ps1 -Target prod` — deploy to production
6. Push the release branch and tags: `git push --all && git push --tags`

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
| `npm run build` | Build for staging |
| `npx ng build --configuration production` | Build for production |
| `npm test` | Run unit tests |
| `.\deploy.ps1 -Target staging` | Full deploy to staging |
| `.\deploy.ps1 -Target prod` | Full deploy to production |
| `.\deploy.ps1 -Target staging -SkipBranch` | Quick deploy (no branch) |

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

**Last Updated**: July 2026