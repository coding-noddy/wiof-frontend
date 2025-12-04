# WIOF Frontend - Setup & Deployment Checklist

## ✅ Pre-Deployment Setup Checklist

### Prerequisites Installation
- [ ] Node.js installed (v14+)
  ```bash
  node --version
  ```
- [ ] npm installed (v6+)
  ```bash
  npm --version
  ```
- [ ] Angular CLI installed globally
  ```bash
  npm install -g @angular/cli
  ng version
  ```
- [ ] Ionic CLI installed globally
  ```bash
  npm install -g ionic
  ionic --version
  ```
- [ ] Firebase CLI installed globally
  ```bash
  npm install -g firebase-tools
  firebase --version
  ```

### Project Setup
- [ ] Repository cloned
  ```bash
  git clone <repo-url>
  cd wiof-frontend
  ```
- [ ] Dependencies installed
  ```bash
  npm install
  ```
- [ ] Firebase CLI authenticated
  ```bash
  firebase login
  ```
- [ ] Firebase projects created
  - [ ] Staging project created (e.g., `wiof-staging`)
  - [ ] Production project created (e.g., `wiof-prod`)
- [ ] Firebase project aliases configured
  ```bash
  firebase use --add
  # Select staging, name it "staging"
  firebase use --add
  # Select production, name it "production"
  ```

### Environment Configuration
- [ ] `src/environments/environment.ts` configured
- [ ] `src/environments/environment.prod.ts` configured
- [ ] Firebase credentials added to environment files
- [ ] `.firebaserc` file created (from template)
  ```bash
  cp .firebaserc.template .firebaserc
  # Edit .firebaserc with your project IDs
  ```
- [ ] `.gitignore` includes Firebase files
  - [ ] `.firebaserc` added to .gitignore
  - [ ] `.env*` files added to .gitignore

### Script Setup
- [ ] `deploy-staging.sh` is executable
  ```bash
  chmod +x deploy-staging.sh
  ```
- [ ] `deploy-production.sh` is executable
  ```bash
  chmod +x deploy-production.sh
  ```
- [ ] `wiof.sh` is executable
  ```bash
  chmod +x wiof.sh
  ```

### Local Testing
- [ ] Development server starts successfully
  ```bash
  npm start
  # or
  ./wiof.sh start
  ```
- [ ] Application loads in browser
- [ ] Linting passes without errors
  ```bash
  npm run lint
  # or
  ./wiof.sh lint
  ```
- [ ] Unit tests pass
  ```bash
  npm test
  # or
  ./wiof.sh test
  ```

---

## 🚀 Staging Deployment Checklist

### Before Staging Deployment
- [ ] All local changes committed to Git
- [ ] Code reviewed (if applicable)
- [ ] Unit tests passing
- [ ] Linting clean
- [ ] Development server tested and working
- [ ] Latest code pulled from repository

### Staging Deployment Steps
- [ ] Run staging deployment script
  ```bash
  ./deploy-staging.sh
  ```
- [ ] Watch for build completion
- [ ] Note the deployment URL
- [ ] Verify deployment success (green checkmark)

### After Staging Deployment
- [ ] Visit staging URL to verify
- [ ] Test all major features
- [ ] Check console for errors
- [ ] Test on multiple browsers (if applicable)
- [ ] Verify Firebase connection working
- [ ] Check that data is loading correctly

### Verify Staging Deployment
```bash
firebase hosting:releases:list --project=staging
firebase hosting:log --project=staging
```

---

## 🌟 Production Deployment Checklist

### Before Production Deployment
- [ ] Staging deployment tested and verified
- [ ] All features working in staging
- [ ] No console errors in staging
- [ ] Code changes reviewed and approved
- [ ] Team notified of impending deployment
- [ ] Database backup created (if needed)
- [ ] Security rules verified
- [ ] Environment configuration verified

### Production Deployment Steps
1. [ ] Run production deployment script
   ```bash
   ./deploy-production.sh
   ```

2. [ ] Read the warning message carefully

3. [ ] Press Enter to continue (first prompt)

4. [ ] Script will:
   - [ ] Run unit tests
   - [ ] Run linting
   - [ ] Build for production
   - [ ] Request final confirmation

5. [ ] Review final warning

6. [ ] Press Enter to deploy to production (final prompt)

7. [ ] Watch for deployment completion

### After Production Deployment
- [ ] Visit production URL
- [ ] Verify all features working
- [ ] Check for console errors
- [ ] Verify database connection
- [ ] Monitor error logs for issues
- [ ] Test critical user flows
- [ ] Verify performance
- [ ] Check Firebase metrics

---

## 📊 Verification Checklist

### Staging Verification
- [ ] Staging URL loads correctly
- [ ] All pages load without errors
- [ ] Database connections working
- [ ] Authentication working
- [ ] File uploads working (if applicable)
- [ ] Forms submitting correctly
- [ ] No console errors (F12)
- [ ] Performance acceptable
- [ ] Mobile responsive (if applicable)

### Production Verification
- [ ] Production URL loads correctly
- [ ] All pages load without errors
- [ ] Database connections working
- [ ] Authentication working
- [ ] Users can log in and access features
- [ ] File uploads working (if applicable)
- [ ] Forms submitting correctly
- [ ] No console errors (F12)
- [ ] Performance acceptable
- [ ] SSL/HTTPS working
- [ ] Custom domain working (if applicable)

---

## 🔐 Security Verification

- [ ] No API keys exposed in source code
- [ ] `.firebaserc` not committed to Git
- [ ] Environment variables properly configured
- [ ] Firebase security rules reviewed
- [ ] Authentication enabled for protected routes
- [ ] Sensitive data encrypted
- [ ] CORS properly configured
- [ ] Rate limiting configured (if needed)
- [ ] Input validation working
- [ ] No sensitive data in logs

---

## 📋 Documentation Checklist

- [ ] README.md reviewed and up-to-date
- [ ] QUICK_START.md reviewed
- [ ] DEPLOYMENT_GUIDE.md reviewed
- [ ] Environment setup documented
- [ ] Deployment procedures documented
- [ ] Rollback procedures documented
- [ ] Team has access to documentation
- [ ] Change log updated

---

## 🔄 Rollback Checklist

If something goes wrong, be prepared to rollback:

```bash
# View deployment history
firebase hosting:releases:list --project=production

# Rollback to previous version
firebase hosting:releases:rollback --project=production

# Or force redeploy
firebase deploy --force --project=production
```

- [ ] Previous working version identified
- [ ] Rollback procedure tested in staging
- [ ] Team notified of issue
- [ ] Rollback executed
- [ ] Rollback verified working
- [ ] Root cause analyzed
- [ ] Fix implemented
- [ ] Redeployed

---

## 📞 Support Contacts

**In case of deployment issues:**

1. Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) troubleshooting section
2. Review Firebase console for errors
3. Check application logs
4. Contact team lead
5. Contact Firebase support if needed

---

## 🎯 Common Commands Reference

```bash
# Setup
npm install                          # Install dependencies
firebase login                       # Login
firebase use --add                  # Configure projects

# Development
npm start                            # Start dev server
npm test                            # Run tests
npm run lint                        # Run linting

# Deployment
./deploy-staging.sh                 # Deploy to staging ⭐
./deploy-production.sh              # Deploy to production ⭐

# Firebase Management
firebase projects:list              # List projects
firebase use                        # Show current project
firebase hosting:releases:list      # View deployment history
firebase hosting:log               # View logs

# Utilities
./wiof.sh help                      # Show all commands
./wiof.sh clean                     # Clean builds
./wiof.sh firebase:status           # Check status
```

---

## 📅 Deployment Schedule

### Regular Deployments
- [ ] Feature branch deployed to staging for testing
- [ ] Code review completed
- [ ] Staging tested
- [ ] Merged to main
- [ ] Production deployment scheduled
- [ ] Off-peak time selected (if applicable)
- [ ] Team notified

### Emergency Hotfixes
- [ ] Issue identified in production
- [ ] Hotfix developed and tested
- [ ] Code review completed
- [ ] Deployed to staging first
- [ ] Verified in staging
- [ ] Emergency production deployment
- [ ] Verification and monitoring
- [ ] Post-mortem scheduled

---

## ✨ Best Practices

- ✅ Always test in staging before production
- ✅ Deploy during off-peak hours
- ✅ Have a rollback plan
- ✅ Monitor after deployment
- ✅ Keep dependencies updated
- ✅ Document all changes
- ✅ Communicate with team
- ✅ Use version control
- ✅ Automate where possible
- ✅ Review security regularly

---

## 📝 Notes

Use this space to document deployment notes:

```
Date: _________________
Deployed by: _________________
Version: _________________
Changes: _________________
Issues: _________________
Status: _________________
```

---

**Last Updated**: December 4, 2025

For questions or help, refer to the documentation files or contact your team lead.
