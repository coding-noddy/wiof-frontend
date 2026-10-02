<#
.SYNOPSIS
    WIOF - one-time production launch, end to end.
.DESCRIPTION
    Runs the whole sequence from docs/PRODUCTION_LAUNCH_RUNBOOK.md in order,
    stopping at the first failure:

      checks         key file, clean git tree, Firebase CLI access
      prerequisites  Google/email sign-in on, custom domain authorized
      tests          Firestore/Storage rules tests (emulator)
      preflight      report production's current state
      backup         dump production Firestore to scripts/backups/
      snapshot       save the DEPLOYED rules, indexes, Hosting version,
                     functions + auth settings and a ready-to-run ROLLBACK.md
      admins         seed admins/{uid} for -AdminEmails
      content        copy the 40 Take Action actions + hero videos from staging
      deploy         deploy.ps1 -Target prod -Backend (rules, indexes,
                     Storage rules, functions, then Hosting)
      polls          rebuild poll_results from raw votes
      indexes        wait until every composite index is READY
      verify         post-launch data checks
      smoke          live end-to-end Take Action test (throwaway users)

    You will be asked to confirm twice: the content copy (after seeing the
    dry run) and the deploy itself (deploy.ps1 asks you to type 'yes'). The
    Firebase CLI may also ask to grant Storage an IAM role - answer yes.

    Everything is logged to scripts/backups/launch-<timestamp>.log.
.PARAMETER AdminEmails
    Comma-separated admin emails. Each must already have a production account
    (preflight lists them). Admins with no production account yet sign in
    once after launch and are added then - see the closing message.
.PARAMETER ProdKey
    Production service account key. Default: scripts\service-account.prod.json
.PARAMETER StartAt
    Resume from this step after fixing a failure (steps before it are skipped).
.EXAMPLE
    .\launch-production.ps1 -AdminEmails "you@example.com,other@example.com"
    .\launch-production.ps1 -AdminEmails "you@example.com" -StartAt polls
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$AdminEmails,

    [string]$ProdKey = "scripts\service-account.prod.json",

    [ValidateSet("checks", "prerequisites", "tests", "preflight", "backup", "snapshot", "admins", "content",
                 "deploy", "polls", "indexes", "verify", "smoke")]
    [string]$StartAt = "checks"
)

# Continue, not Stop: every native call below is checked via $LASTEXITCODE,
# and in Windows PowerShell 5.1 "Stop" turns any stderr warning from
# firebase/npm/node into a terminating error.
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot

$Steps = @("checks", "prerequisites", "tests", "preflight", "backup", "snapshot", "admins", "content",
           "deploy", "polls", "indexes", "verify", "smoke")
$startIndex = [array]::IndexOf($Steps, $StartAt)
$keyPath = (Resolve-Path $ProdKey -ErrorAction SilentlyContinue).Path

$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
New-Item -ItemType Directory -Force "scripts\backups" | Out-Null
$logFile = "scripts\backups\launch-$stamp.log"
Start-Transcript -Path $logFile | Out-Null

function Show-Step($name, $title) {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  [$([array]::IndexOf($Steps, $name) + 1)/$($Steps.Count)] $title" -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
}

function Stop-Launch($step, $message) {
    Write-Host ""
    Write-Host "[x] LAUNCH STOPPED at step '$step': $message" -ForegroundColor Red
    Write-Host "    Fix the problem, then resume with:" -ForegroundColor Yellow
    Write-Host "    .\launch-production.ps1 -AdminEmails `"$AdminEmails`" -StartAt $step" -ForegroundColor Yellow
    Write-Host "    Log: $logFile" -ForegroundColor Yellow
    Stop-Transcript | Out-Null
    exit 1
}

function Invoke-Launch($step, [string[]]$nodeArgs) {
    & node scripts/prod-launch.js @nodeArgs --prod-key $keyPath
    if ($LASTEXITCODE -ne 0) { Stop-Launch $step "prod-launch.js $($nodeArgs[0]) failed (see output above)" }
}

function Confirm-Continue($step, $question) {
    $answer = Read-Host "$question Type 'yes' to continue"
    if ($answer -ne "yes") { Stop-Launch $step "not confirmed" }
}

function Should-Run($step) { return [array]::IndexOf($Steps, $step) -ge $startIndex }

Write-Host ""
Write-Host "  WIOF PRODUCTION LAUNCH  (wiof-production)" -ForegroundColor Red
Write-Host "  Admins: $AdminEmails" -ForegroundColor Red
if ($StartAt -ne "checks") { Write-Host "  Resuming at: $StartAt" -ForegroundColor Yellow }

# 1. checks
if (Should-Run "checks") {
    Show-Step "checks" "Local checks"
    if (-not $keyPath) { Stop-Launch "checks" "production key not found at $ProdKey" }
    $projectId = (Get-Content $keyPath -Raw | ConvertFrom-Json).project_id
    if ($projectId -ne "wiof-production") { Stop-Launch "checks" "key is for '$projectId', not wiof-production" }
    Write-Host "  key: $keyPath ($projectId)" -ForegroundColor Green

    $dirty = git status --porcelain --untracked-files=no
    if ($dirty) {
        Write-Host $dirty
        Stop-Launch "checks" "uncommitted changes - commit first (deploy.ps1 builds and branches from the working tree)"
    }
    Write-Host "  git: clean ($(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD))" -ForegroundColor Green

    # Production deploys only from master (the remote's default branch), and
    # only when it matches origin/master - no unpushed or stale local state.
    $branch = git rev-parse --abbrev-ref HEAD
    if ($branch -ne "master") { Stop-Launch "checks" "on branch '$branch' - production deploys only from master (git checkout master)" }
    git fetch origin master --quiet
    if ($LASTEXITCODE -ne 0) { Stop-Launch "checks" "could not fetch origin/master to compare" }
    if ((git rev-parse HEAD) -ne (git rev-parse origin/master)) {
        Stop-Launch "checks" "local master differs from origin/master - pull or push first so production matches what's on GitHub"
    }
    Write-Host "  branch: master, in sync with origin/master" -ForegroundColor Green

    # deploy.ps1 switches to release-<version> if it already exists - that
    # would build and ship that branch's old code instead of this one.
    $version = (Get-Content "package.json" -Raw | ConvertFrom-Json).version
    if (git branch --list "release-$version") { Stop-Launch "checks" "branch release-$version already exists - bump the version in package.json (and commit) first" }
    if (git tag --list "v$version-prod") { Stop-Launch "checks" "tag v$version-prod already exists - bump the version in package.json (and commit) first" }
    Write-Host "  version: $version (will create release-$version, tag v$version-prod)" -ForegroundColor Green
    Confirm-Continue "checks" "Deploy production from branch '$(git rev-parse --abbrev-ref HEAD)' at $(git log -1 --format='%h %s')?"

    $projects = firebase projects:list | Out-String
    if ($projects -notmatch "wiof-production") { Stop-Launch "checks" "Firebase CLI has no access to wiof-production (run: firebase login)" }
    Write-Host "  firebase CLI: has access to wiof-production" -ForegroundColor Green
}

# 2. prerequisites
if (Should-Run "prerequisites") {
    Show-Step "prerequisites" "Console prerequisites"
    Invoke-Launch "prerequisites" @("prerequisites")
    Confirm-Continue "prerequisites" "Is the OAuth consent screen set to 'In production' (cannot be checked automatically)?"
}

# 3. tests
if (Should-Run "tests") {
    Show-Step "tests" "Security rules tests"
    npm run test:rules
    if ($LASTEXITCODE -ne 0) { Stop-Launch "tests" "rules tests failed" }
}

# 4. preflight
if (Should-Run "preflight") {
    Show-Step "preflight" "Production state before launch"
    Invoke-Launch "preflight" @("preflight")
}

# 5. backup
if (Should-Run "backup") {
    Show-Step "backup" "Backup production Firestore"
    Invoke-Launch "backup" @("backup")
}

# 6. snapshot - the pre-launch deployed configuration, for rollback
if (Should-Run "snapshot") {
    Show-Step "snapshot" "Snapshot deployed configuration (rollback kit)"
    Invoke-Launch "snapshot" @("snapshot-config")
}

# 7. admins
if (Should-Run "admins") {
    Show-Step "admins" "Seed admins"
    Invoke-Launch "admins" @("seed-admins", "--email", $AdminEmails, "--apply")
}

# 8. content
if (Should-Run "content") {
    Show-Step "content" "Take Action catalogue + hero videos (from staging)"
    Invoke-Launch "content" @("seed-content")
    Confirm-Continue "content" "Copy the above to production?"
    Invoke-Launch "content" @("seed-content", "--apply")
}

# 9. deploy
if (Should-Run "deploy") {
    Show-Step "deploy" "Deploy backend + Hosting to production"
    powershell -ExecutionPolicy Bypass -File .\deploy.ps1 -Target prod -Backend
    if ($LASTEXITCODE -ne 0) { Stop-Launch "deploy" "deploy.ps1 failed or was cancelled" }
}

# 10. polls - right after deploy: until this runs, every poll shows 0 votes
if (Should-Run "polls") {
    Show-Step "polls" "Backfill poll results"
    Invoke-Launch "polls" @("backfill-polls", "--apply")
}

# 11. indexes
if (Should-Run "indexes") {
    Show-Step "indexes" "Wait for Firestore indexes"
    Invoke-Launch "indexes" @("wait-indexes")
}

# 12. verify
if (Should-Run "verify") {
    Show-Step "verify" "Verify production data"
    Invoke-Launch "verify" @("verify")
    firebase functions:list --project wiof-production
}

# 13. smoke
if (Should-Run "smoke") {
    Show-Step "smoke" "Live smoke test"
    Invoke-Launch "smoke" @("smoke", "--apply")
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  PRODUCTION LAUNCH COMPLETE" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Now do the manual browser check (runbook, Phase 3) on https://worldisonefamily.com" -ForegroundColor Cyan
Write-Host "  in a private window: guest pages, polls, Google sign-in, My Journey, Take Action," -ForegroundColor Cyan
Write-Host "  a WhatsApp blog share, and the admin dashboard." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Admins who had no production account yet: sign in once with Google, then run" -ForegroundColor Cyan
Write-Host "    node scripts/prod-launch.js seed-admins --email them@example.com --apply" -ForegroundColor Cyan
Write-Host ""
Write-Host "  To roll back: .estore-production.ps1 -Snapshot <the pre-launch kit below>" -ForegroundColor Cyan
Write-Host "  Rollback kit (pre-launch config + exact commands):" -ForegroundColor Cyan
Write-Host "    $((Get-ChildItem scripts\backups -Directory -Filter 'prod-config-*' | Sort-Object Name | Select-Object -Last 1).FullName)\ROLLBACK.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Log: $logFile" -ForegroundColor Cyan
Stop-Transcript | Out-Null
