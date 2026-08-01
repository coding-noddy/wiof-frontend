<#
.SYNOPSIS
    WIOF Frontend - Unified Deployment Script
.PARAMETER Target
    "staging" or "prod"
.PARAMETER SkipBranch
    Skip release branch creation
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

$firebaseProject = if ($Target -eq "prod") { "wiof-production" } else { "wiof-staging" }
$buildConfig = if ($Target -eq "prod") { "production" } else { "" }
$envLabel = if ($Target -eq "prod") { "PRODUCTION" } else { "STAGING" }

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WIOF Frontend - $envLabel Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Production warning
if ($Target -eq "prod") {
    Write-Host "[!] WARNING: Deploying to PRODUCTION!" -ForegroundColor Red
    Write-Host "    This will update the LIVE website." -ForegroundColor Red
    Write-Host ""
    $confirm = Read-Host "Type 'yes' to confirm"
    if ($confirm -ne "yes") {
        Write-Host "[x] Deployment cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Step 1: Version and branch
$pkg = Get-Content "package.json" | ConvertFrom-Json
$version = $pkg.version

if (-not $SkipBranch) {
    Write-Host "[1/6] Creating release branch..." -ForegroundColor Yellow
    $branchName = "release-$version"

    # Update version in footer
    $footerTs = Get-Content "src\app\components\wiof-footer\wiof-footer.component.ts" -Raw
    $pattern = "appVersion = '.*?'"
    $replacement = "appVersion = '" + $version + "'"
    $footerTs = $footerTs -replace $pattern, $replacement
    Set-Content "src\app\components\wiof-footer\wiof-footer.component.ts" $footerTs

    $existingBranch = git branch --list $branchName 2>$null
    if ($existingBranch) {
        Write-Host "      Branch $branchName already exists, switching to it." -ForegroundColor Yellow
        git checkout $branchName
    } else {
        git checkout -b $branchName
        Write-Host "      Created branch: $branchName" -ForegroundColor Green
    }
} else {
    $branchName = git rev-parse --abbrev-ref HEAD
    Write-Host "[1/6] Using current branch: $branchName" -ForegroundColor Yellow
}

# Step 2: Clean
Write-Host "[2/6] Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
Write-Host "      Done." -ForegroundColor Green

# Step 3: Dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[3/6] Installing dependencies..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[3/6] Dependencies OK." -ForegroundColor Green
}

# Step 4: Build
Write-Host "[4/6] Building ($envLabel)..." -ForegroundColor Yellow
if ($buildConfig) {
    npx ng build --configuration $buildConfig
} else {
    npx ng build
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "[x] Build FAILED!" -ForegroundColor Red
    exit 1
}
Write-Host "      Build successful." -ForegroundColor Green

# Step 5: Deploy
Write-Host "[5/6] Deploying to Firebase ($firebaseProject)..." -ForegroundColor Yellow
firebase deploy --only hosting --project $firebaseProject
if ($LASTEXITCODE -ne 0) {
    Write-Host "[x] Deployment FAILED!" -ForegroundColor Red
    exit 1
}
Write-Host "      Deployed." -ForegroundColor Green

# Step 6: Tag
$tagName = "v$version-$Target"
$existingTag = git tag --list $tagName 2>$null
if (-not $existingTag) {
    git tag -a $tagName -m "Deploy $version to $envLabel"
    Write-Host "[6/6] Tagged: $tagName" -ForegroundColor Green
} else {
    Write-Host "[6/6] Tag $tagName already exists, skipping." -ForegroundColor Yellow
}

# Done
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  $envLabel deployment complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
if ($Target -eq "staging") {
    Write-Host "  URL: https://wiof-staging.web.app" -ForegroundColor Cyan
} else {
    Write-Host "  URL: https://wiof-production.web.app" -ForegroundColor Cyan
}
Write-Host "  Branch: $branchName" -ForegroundColor Cyan
Write-Host "  Tag: $tagName" -ForegroundColor Cyan
Write-Host ""
