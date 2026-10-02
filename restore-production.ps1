<#
.SYNOPSIS
    WIOF - restore production to a saved configuration snapshot (rollback, or
    roll forward again).
.DESCRIPTION
    Restores the Hosting version and the Firestore + Storage rules captured in
    a snapshot kit (scripts/backups/prod-config-<timestamp>/, written by
    `node scripts/prod-launch.js snapshot-config` and by launch-production.ps1).

      1. Takes a NEW snapshot of the current state first - so this restore can
         itself be undone by running this script again with that snapshot.
      2. Shows the plan and asks you to type 'yes'.
      3. Deploys the snapshot's rules (exactly as they were live), then
         immediately clones the snapshot's Hosting version to live - rules
         and site always go together.
      4. Verifies the live site and rules now match the snapshot.
      5. Reports Cloud Functions and Google sign-in differences (manual, and
         optional: neither breaks the restored site).

    Data is not touched. For data, see the snapshot's ROLLBACK.md.

    Rollback after launch:   use the snapshot launch-production.ps1 took at its
                             'snapshot' step (pre-launch state).
    Roll forward again:      use the snapshot this script took in step 1 of
                             that rollback (the launched state).
.PARAMETER Snapshot
    Snapshot folder to restore. Omit it to list the available snapshots.
.EXAMPLE
    .\restore-production.ps1
    .\restore-production.ps1 -Snapshot scripts\backups\prod-config-2026-10-02T18-07-26-379Z
#>

param(
    [string]$Snapshot,
    [string]$ProdKey = "scripts\service-account.prod.json"
)

# Continue, not Stop: native calls are checked via $LASTEXITCODE (Windows
# PowerShell 5.1 + "Stop" turns any stderr warning into a terminating error).
$ErrorActionPreference = "Continue"
Set-Location $PSScriptRoot
$Project = "wiof-production"

function Fail($message) {
    Write-Host ""
    Write-Host "[x] RESTORE STOPPED: $message" -ForegroundColor Red
    if ($script:logFile) { Write-Host "    Log: $script:logFile" -ForegroundColor Yellow; Stop-Transcript | Out-Null }
    exit 1
}

function Get-Snapshots {
    Get-ChildItem "scripts\backups" -Directory -Filter "prod-config-*" -ErrorAction SilentlyContinue | Sort-Object Name
}

function Read-Kit($dir) {
    $meta = Get-Content (Join-Path $dir "meta.json") -Raw | ConvertFrom-Json
    $hosting = Get-Content (Join-Path $dir "hosting.json") -Raw | ConvertFrom-Json
    $functions = @()
    try { $functions = @((Get-Content (Join-Path $dir "functions.json") -Raw | ConvertFrom-Json).result | ForEach-Object { "$($_.id)@$($_.region)" }) } catch {}
    $auth = Get-Content (Join-Path $dir "auth.json") -Raw | ConvertFrom-Json
    return [pscustomobject]@{
        Dir = $dir
        Meta = $meta
        VersionId = $hosting.liveVersionId
        FileCount = $hosting.liveFileCount
        Fingerprint = $hosting.liveFilesFingerprint
        Config = ($hosting.liveRelease.version.config | ConvertTo-Json -Depth 10 -Compress)
        Functions = $functions
        GoogleEnabled = ($auth.googleProvider -is [psobject]) -and $auth.googleProvider.enabled
        FirestoreRules = (Get-Content (Join-Path $dir "rollback\firestore.rules") -Raw)
        StorageRules = (Get-Content (Join-Path $dir "rollback\storage.rules") -Raw)
    }
}

# --- no snapshot given: list them ---
if (-not $Snapshot) {
    $all = Get-Snapshots
    if (-not $all) { Write-Host "No snapshots in scripts\backups. Take one with: node scripts/prod-launch.js snapshot-config"; exit 1 }
    Write-Host ""
    Write-Host "Available snapshots (oldest first):" -ForegroundColor Cyan
    foreach ($d in $all) {
        try {
            $k = Read-Kit $d.FullName
            Write-Host ("  {0}   site version {1}  ({2} files)  git: {3}" -f $d.Name, $k.VersionId, $k.FileCount, $k.Meta.gitHeadAtSnapshot)
        } catch { Write-Host "  $($d.Name)   (incomplete kit)" -ForegroundColor DarkGray }
    }
    Write-Host ""
    Write-Host "Restore one with: .\restore-production.ps1 -Snapshot scripts\backups\<name>" -ForegroundColor Cyan
    exit 0
}

$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$script:logFile = "scripts\backups\restore-$stamp.log"
Start-Transcript -Path $script:logFile | Out-Null

# --- 1. validate the target kit ---
$targetDir = (Resolve-Path $Snapshot -ErrorAction SilentlyContinue).Path
if (-not $targetDir) { Fail "snapshot folder not found: $Snapshot" }
foreach ($f in @("meta.json", "hosting.json", "auth.json", "rollback\firestore.rules", "rollback\storage.rules", "rollback\firebase.json")) {
    if (-not (Test-Path (Join-Path $targetDir $f))) { Fail "snapshot is incomplete - missing $f" }
}
$target = Read-Kit $targetDir
if ($target.Meta.project -ne $Project) { Fail "snapshot is for '$($target.Meta.project)', not $Project" }
if (-not $target.VersionId) { Fail "snapshot has no Hosting version id" }
if (-not $target.Fingerprint) { Fail "snapshot predates file fingerprints - take a fresh one (node scripts/prod-launch.js snapshot-config) or use the commands in its ROLLBACK.md" }

# --- 2. snapshot the current state (so this restore can be undone) ---
Write-Host ""
Write-Host "[1/5] Snapshotting the CURRENT state first (undo point)..." -ForegroundColor Yellow
$before = @(Get-Snapshots | ForEach-Object { $_.FullName })
& node scripts/prod-launch.js snapshot-config --prod-key $ProdKey
if ($LASTEXITCODE -ne 0) { Fail "could not snapshot the current state - not restoring without an undo point" }
$undoDir = (Get-Snapshots | Where-Object { $before -notcontains $_.FullName } | Select-Object -Last 1).FullName
$current = Read-Kit $undoDir

# --- 3. plan + confirm ---
$rulesSame = ($current.FirestoreRules -eq $target.FirestoreRules) -and ($current.StorageRules -eq $target.StorageRules)
Write-Host ""
Write-Host "[2/5] Restore plan for $Project" -ForegroundColor Yellow
Write-Host "  From snapshot : $targetDir"
Write-Host "  taken at      : $($target.Meta.takenAt)   (git then: $($target.Meta.gitHeadAtSnapshot))"
Write-Host ("  Site          : live version {0} ({1} files)  ->  version {2} ({3} files)" -f $current.VersionId, $current.FileCount, $target.VersionId, $target.FileCount)
Write-Host ("  Rules         : {0}" -f $(if ($rulesSame) { "already identical - will redeploy anyway" } else { "Firestore + Storage rules replaced with the snapshot's" }))
Write-Host "  Undo point    : $undoDir" -ForegroundColor Cyan
Write-Host ""
if ($current.Fingerprint -and $current.Fingerprint -eq $target.Fingerprint -and $current.Config -eq $target.Config -and $rulesSame) {
    Write-Host "  Production already matches this snapshot - nothing to do." -ForegroundColor Green
    Stop-Transcript | Out-Null
    exit 0
}
Write-Host "  [!] This changes the LIVE site at https://worldisonefamily.com" -ForegroundColor Red
$answer = Read-Host "  Type 'yes' to restore"
if ($answer -ne "yes") { Fail "not confirmed" }

# --- 4. rules, then site immediately ---
Write-Host ""
Write-Host "[3/5] Deploying the snapshot's Firestore + Storage rules..." -ForegroundColor Yellow
Push-Location (Join-Path $targetDir "rollback")
firebase deploy --only firestore:rules,storage --project $Project
$rulesExit = $LASTEXITCODE
Pop-Location
if ($rulesExit -ne 0) { Fail "rules deploy failed - the site was NOT changed (rules are as before, or partly updated: re-run this script)" }

Write-Host "[4/5] Restoring site version $($target.VersionId) to live..." -ForegroundColor Yellow
firebase hosting:clone "${Project}@$($target.VersionId)" "${Project}:live"
if ($LASTEXITCODE -ne 0) {
    Fail "site restore failed AFTER rules changed - fix and re-run this script, or restore the undo point: .\restore-production.ps1 -Snapshot `"$undoDir`""
}

# --- 5. verify ---
Write-Host "[5/5] Verifying..." -ForegroundColor Yellow
$beforeVerify = @(Get-Snapshots | ForEach-Object { $_.FullName })
& node scripts/prod-launch.js snapshot-config --prod-key $ProdKey | Out-Null
$afterDir = (Get-Snapshots | Where-Object { $beforeVerify -notcontains $_.FullName } | Select-Object -Last 1).FullName
$after = Read-Kit $afterDir
# A clone becomes a NEW version id, so compare what it serves: every file path +
# content hash (fingerprint) and the Hosting config (rewrites/headers).
$siteOk = ($after.Fingerprint -eq $target.Fingerprint) -and ($after.Config -eq $target.Config)
$rulesOk = ($after.FirestoreRules -eq $target.FirestoreRules) -and ($after.StorageRules -eq $target.StorageRules)
Write-Host ("  site  : {0}  (now version {1}: {2} files, identical paths + content hashes to the snapshot, same config)" -f $(if ($siteOk) { "OK" } else { "MISMATCH" }), $after.VersionId, $after.FileCount)
Write-Host ("  rules : {0}" -f $(if ($rulesOk) { "OK" } else { "MISMATCH" }))
Remove-Item -Recurse -Force $afterDir   # verification-only snapshot

# Manual, optional follow-ups
$extraFns = @($current.Functions | Where-Object { $target.Functions -notcontains $_ })
$missingFns = @($target.Functions | Where-Object { $current.Functions -notcontains $_ })
Write-Host ""
if ($extraFns.Count) {
    Write-Host "  Functions not in the snapshot (harmless to the restored site; remove only if you want to):" -ForegroundColor Cyan
    $extraFns | ForEach-Object {
        $n, $r = $_ -split "@"
        Write-Host "    firebase functions:delete $n --region $r --project $Project --force"
    }
}
if ($missingFns.Count) {
    Write-Host "  Functions the snapshot had that are missing now: $($missingFns -join ', ')" -ForegroundColor Cyan
    Write-Host "    Redeploy them from the matching git commit ($($target.Meta.gitHeadAtSnapshot)) with: firebase deploy --only functions --project $Project"
}
if ($current.GoogleEnabled -ne $target.GoogleEnabled) {
    $state = $(if ($target.GoogleEnabled) { "ENABLED" } else { "DISABLED" })
    Write-Host "  Google sign-in was $state in the snapshot - change it in Firebase Console > Authentication > Sign-in method if you want to match." -ForegroundColor Cyan
}

Write-Host ""
if ($siteOk -and $rulesOk) {
    Write-Host "  RESTORE COMPLETE. To undo it:" -ForegroundColor Green
} else {
    Write-Host "  RESTORE FINISHED WITH MISMATCHES - check above. To undo it:" -ForegroundColor Red
}
Write-Host "    .\restore-production.ps1 -Snapshot `"$undoDir`"" -ForegroundColor Green
Write-Host "  Log: $script:logFile"
Stop-Transcript | Out-Null
if (-not ($siteOk -and $rulesOk)) { exit 1 }
