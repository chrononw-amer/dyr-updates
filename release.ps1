# ============================================================
#  DYR Release Script - Builds EXE + APK + Uploads to GitHub
# ============================================================
#  Usage:
#    .\release.ps1                  # Auto-bump patch (1.7.6 -> 1.7.7)
#    .\release.ps1 -Version "2.0.0" # Set specific version
#    .\release.ps1 -SkipBuild       # Upload existing builds only
# ============================================================

param(
    [string]$Version = "",
    [switch]$SkipBuild = $false
)

# ---- CONFIGURATION (EDIT THESE!) ----
$GITHUB_OWNER = "chrononw-amer"   # GitHub username
$GITHUB_REPO  = "dyr-updates"
$GH_TOKEN     = $env:GH_TOKEN           # Set via: $env:GH_TOKEN = "ghp_xxxx"
# ---- END CONFIGURATION ----

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

# Colors
function Write-Step($msg)    { Write-Host "`n🔹 $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Fail($msg)    { Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info($msg)    { Write-Host "   $msg" -ForegroundColor DarkGray }

# ============================================================
# 1. VALIDATE
# ============================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║     DYR RELEASE BUILDER v1.0         ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Yellow

if ($GITHUB_OWNER -eq "YOUR_GITHUB_USERNAME") {
    Write-Fail "Please edit release.ps1 and set your GITHUB_OWNER!"
    Write-Info "Open the file and change line 20: `$GITHUB_OWNER = 'your_actual_username'"
    exit 1
}

if (-not $GH_TOKEN) {
    Write-Fail "GitHub token not set! Run this first:"
    Write-Info '  $env:GH_TOKEN = "ghp_your_token_here"'
    Write-Info "Get a token at: https://github.com/settings/tokens"
    exit 1
}

# ============================================================
# 2. VERSION BUMP
# ============================================================
$pkgJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $pkgJson.version

if ($Version -eq "") {
    # Auto-bump patch version (1.7.5 -> 1.7.6)
    $parts = $currentVersion.Split(".")
    $parts[2] = [int]$parts[2] + 1
    $Version = $parts -join "."
}

Write-Step "Version: $currentVersion → $Version"

if (-not $SkipBuild) {
    # Update package.json
    $pkgContent = Get-Content "package.json" -Raw
    $pkgContent = $pkgContent -replace "`"version`": `"$currentVersion`"", "`"version`": `"$Version`""
    $pkgContent | Set-Content "package.json" -NoNewline
    Write-Success "package.json updated"

    # Update android/app/build.gradle
    $gradleFile = "android\app\build.gradle"
    $gradleContent = Get-Content $gradleFile -Raw
    
    # Bump versionCode (extract current, add 1)
    if ($gradleContent -match 'versionCode\s+(\d+)') {
        $oldCode = [int]$Matches[1]
        $newCode = $oldCode + 1
        $gradleContent = $gradleContent -replace "versionCode\s+$oldCode", "versionCode $newCode"
        Write-Info "Android versionCode: $oldCode → $newCode"
    }
    $gradleContent = $gradleContent -replace "versionName `"[^`"]+`"", "versionName `"$Version`""
    $gradleContent | Set-Content $gradleFile -NoNewline
    Write-Success "build.gradle updated"

    # Update SessionService.js
    $sessionFile = "src\services\SessionService.js"
    $sessionContent = Get-Content $sessionFile -Raw
    $sessionContent = $sessionContent -replace "appVersion = '[^']+'", "appVersion = '$Version'"
    $sessionContent | Set-Content $sessionFile -NoNewline
    Write-Success "SessionService.js updated"
}

# ============================================================
# 3. BUILD WEB (Vite + Obfuscation)
# ============================================================
if (-not $SkipBuild) {
    Write-Step "Building web app (Vite + obfuscation)..."
    npx vite build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "Vite build failed!"; exit 1 }
    Write-Success "Web build complete"
}

# ============================================================
# 4. BUILD EXE (Electron Builder)
# ============================================================
$exePath = "release\DYR-$Version-Setup.exe"
$ymlPath = "release\latest.yml"

if (-not $SkipBuild) {
    Write-Step "Building EXE installer..."
    npx electron-builder --win 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Fail "EXE build failed!"; exit 1 }
    
    if (Test-Path $exePath) {
        $exeSize = [math]::Round((Get-Item $exePath).Length / 1MB, 1)
        Write-Success "EXE built: DYR-$Version-Setup.exe ($exeSize MB)"
    } else {
        Write-Fail "EXE file not found at $exePath"
        exit 1
    }
}

# ============================================================
# 5. BUILD APK (Android)
# ============================================================
$apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"

if (-not $SkipBuild) {
    Write-Step "Building APK..."
    
    # Sync web to Android
    npx cap sync android 2>&1 | Out-Null
    
    # Set Java to Android Studio's JDK
    $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
    
    Push-Location "android"
    .\gradlew.bat assembleDebug 2>&1 | Out-Null
    $gradleResult = $LASTEXITCODE
    Pop-Location
    
    if ($gradleResult -ne 0) { 
        Write-Fail "APK build failed! Make sure Android Studio is installed."
        Write-Info "Continuing with EXE upload only..."
    } else {
        if (Test-Path $apkPath) {
            $apkSize = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
            Write-Success "APK built: app-release-unsigned.apk ($apkSize MB)"
        }
    }
}

# ============================================================
# 6. CREATE GITHUB RELEASE
# ============================================================
Write-Step "Creating GitHub Release v$Version..."

$headers = @{
    "Authorization" = "token $GH_TOKEN"
    "Accept"        = "application/vnd.github.v3+json"
    "User-Agent"    = "DYR-Release-Script"
}

$releaseBody = @{
    tag_name         = "v$Version"
    target_commitish = "main"
    name             = "DYR v$Version"
    body             = "## DYR v$Version`n`nRelease Date: $(Get-Date -Format 'yyyy-MM-dd')`n`n### Downloads`n- **Windows:** DYR-$Version-Setup.exe`n- **Android:** app-release-unsigned.apk"
    draft            = $false
    prerelease       = $false
} | ConvertTo-Json

$apiBase = "https://api.github.com/repos/$GITHUB_OWNER/$GITHUB_REPO"

try {
    # Check if release already exists
    try {
        $existing = Invoke-RestMethod -Uri "$apiBase/releases/tags/v$Version" -Headers $headers -Method Get 2>$null
        Write-Info "Release v$Version already exists, deleting..."
        Invoke-RestMethod -Uri "$apiBase/releases/$($existing.id)" -Headers $headers -Method Delete | Out-Null
    } catch { }

    $release = Invoke-RestMethod -Uri "$apiBase/releases" -Headers $headers -Method Post -Body $releaseBody -ContentType "application/json"
    Write-Success "GitHub Release created: v$Version"
    $uploadUrl = $release.upload_url -replace '\{.*\}', ''
} catch {
    Write-Fail "Failed to create release: $($_.Exception.Message)"
    Write-Info "Make sure:"
    Write-Info "  1. Repo '$GITHUB_OWNER/$GITHUB_REPO' exists"
    Write-Info "  2. Token has 'repo' permissions"
    Write-Info "  3. Check: https://github.com/$GITHUB_OWNER/$GITHUB_REPO"
    exit 1
}

# ============================================================
# 7. UPLOAD FILES
# ============================================================
function Upload-Asset($filePath, $fileName) {
    if (-not (Test-Path $filePath)) {
        Write-Info "Skipping $fileName (file not found)"
        return
    }
    
    $fileSize = [math]::Round((Get-Item $filePath).Length / 1MB, 1)
    Write-Info "Uploading $fileName ($fileSize MB)..."
    
    $uploadHeaders = @{
        "Authorization" = "token $GH_TOKEN"
        "Content-Type"  = "application/octet-stream"
        "User-Agent"    = "DYR-Release-Script"
    }
    
    try {
        $fileBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $filePath))
        $result = Invoke-RestMethod -Uri "$uploadUrl`?name=$fileName" -Headers $uploadHeaders -Method Post -Body $fileBytes
        Write-Success "Uploaded: $fileName ($fileSize MB)"
    } catch {
        Write-Fail "Upload failed for $fileName`: $($_.Exception.Message)"
    }
}

Write-Step "Uploading release files..."

# Upload EXE
Upload-Asset $exePath "DYR-$Version-Setup.exe"

# Upload latest.yml (required for auto-update)
Upload-Asset $ymlPath "latest.yml"

# Upload blockmap (for delta updates)
$blockmapPath = "$exePath.blockmap"
Upload-Asset $blockmapPath "DYR-$Version-Setup.exe.blockmap"

# Upload APK
if (Test-Path $apkPath) {
    # Copy APK with proper name
    $namedApk = "release\DYR-$Version.apk"
    Copy-Item $apkPath $namedApk -Force
    Upload-Asset $namedApk "DYR-$Version.apk"
    Remove-Item $namedApk -Force -ErrorAction SilentlyContinue
}

# ============================================================
# 8. DONE!
# ============================================================
Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     🎉 RELEASE v$Version COMPLETE!      ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Info "GitHub Release: https://github.com/$GITHUB_OWNER/$GITHUB_REPO/releases/tag/v$Version"
Write-Info ""
Write-Info "All running DYR apps will auto-detect this update!"
Write-Host ""
