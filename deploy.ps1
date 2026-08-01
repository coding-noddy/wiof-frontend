<#
.SYNOPSIS
    WIOF Frontend - Unified Deployment Script

.DESCRIPTION
    Automates the full deployment pipeline:
    1. Creates a release branch from current branch
    2. Builds Angular app (staging or production)
    3. Deploys to Firebase (staging or production)
    4. Tags the release in git

.PARAMETER Target
    "staging" or "prod" — determines which environment to deploy to

.PARAMETER SkipBranch
    Skip release branch creation (deploy from current branch)

.EXAMPLE
    .\deploy.ps1 -Target staging
    .\deploy.ps1 -Target prod
    .\deploy.ps1 -Target staging -SkipBranch
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("staging", "prod")]
    [string]$Target,

    [switch]$SkipBranch
)

$ErrorActionPreference = "Stop"

# ── Config ─────────────────────────────────────────────────────
$firebaseProject = if ($Target -eq "prod") { "wiof-production" } else { "wiof-staging" }
$buildConfig = if ($Target -eq "prod") { "production" } else { "" }
$envLabel = if ($Target -eq "prod") { "PRODUCTION" } else { "STAGING" }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WIOF Frontend - $envLabel Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── Production warning ──────────────────────────────────────────
if ($Target -eq "prod") {
    Write-Host "⚠️  WARNING: Deploying to PRODUCTION!" -ForegroundColor Red
    Write-Host "This will update the LIVE website." -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Type 'yes' to confirm"
    if ($confirm -ne "yes") {
        Write-Host "❌ Deployment cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# ── Step 1: Create release branch ──────────────────────────────
if (-not $SkipBranch) {
    Write-Host "📋 Creating release branch..." -ForegroundColor Yellow

    # Get current version from package.json
    $pkg = Get-Content "package.json" | ConvertFrom-Json
    $version = $pkg.version
    $branchName = "release-$version"

    # Update version in footer component so it shows in the app
    $footerTs = Get-Content "src\app\components\wiof-footer\wiof-footer.component.ts" -Raw
    $footerTs = $footerTs -replace "appVersion = '[^']*'", "appVersion = '$version'"
    Set-Content "src\app\components\wiof-footer\wiof-footer.component.ts" $footerTs

    # Check if branch already exists
    $existingBranch = git branch --list $branchName 2>$null
    if ($existingBranch) {
        Write-Host "   Branch $branchName already exists, using it." -ForegroundColor Yellow
        git checkout $branchName
    } else {
        git checkout -b $branchName
        Write-Host "   ✅ Created branch: $branchName" -ForegroundColor Green
    }
} else {
    $branchName = git rev-parse --abbrev-ref HEAD
    $pkg = Get-Content "package.json" | ConvertFrom-Json
    $version = $pkg.version
    Write-Host "📋 Deploying from current branch: $branchName" -ForegroundColor Yellow
}

# ── Step 2: Clean previous build ───────────────────────────────
Write-Host ""
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
Write-Host "   ✅ Clean" -ForegroundColor Green

# ── Step 3: Install dependencies ───────────────────────────────
if (-not (Test-Path "node_modules")) {
    Write-Host ""
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# ── Step 4: Build ──────────────────────────────────────────────
Write-Host ""
Write-Host "🔨 Building Angular app ($envLabel)..." -ForegroundColor Yellow

if ($buildConfig) {
    $buildResult = npx ng build --configuration $buildConfig 2>&1
} else {
    $buildResult = npx ng build 2>&1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build FAILED!" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}
Write-Host "   ✅ Build successful!" -ForegroundColor Green

# ── Step 5: Deploy to Firebase ─────────────────────────────────
Write-Host ""
Write-Host "🔥 Deploying to Firebase ($firebaseProject)..." -ForegroundColor Yellow

firebase deploy --only hosting --project $firebaseProject

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment FAILED!" -ForegroundColor Red
    exit 1
}

# ── Step 6: Tag release ────────────────────────────────────────
$tagName = "v$version-$Target"
$existingTag = git tag --list $tagName 2>$null
if (-not $existingTag) {
    git tag -a $tagName -m "Deploy $version to $envLabel"
    Write-Host ""
    Write-Host "🏷️  Tagged: $tagName" -ForegroundColor Green
}

# ── Done ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ $envLabel deployment complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
if ($Target -eq "staging") {
    Write-Host "🌐 Live at: https://wiof-staging.web.app" -ForegroundColor Cyan
} else {
    Write-Host "🌐 Live at: https://wiof-production.web.app" -ForegroundColor Cyan
}
Write-Host "📋 Branch: $branchName" -ForegroundColor Cyan
Write-Host "🏷️  Tag: $tagName" -ForegroundColor Cyan
Write-Host ""
