# NetSentinel Full Build Script (Windows)
# Builds the Python engine with PyInstaller and packages the Electron app
# Run from repository root (netsentinel/)

param(
    [switch]$SkipPython
)

Write-Host "=== NetSentinel Full Build ===" -ForegroundColor Cyan

# 1. Build Python engine with PyInstaller
if (-not $SkipPython) {
    Write-Host "[1/3] Building Python engine with PyInstaller..." -ForegroundColor Yellow
    Set-Location -Path $PSScriptRoot\..\engine

    # Clean previous builds
    if (Test-Path "build") { Remove-Item -Recurse -Force "build" }
    if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
    if (Test-Path "*.spec") { Remove-Item -Force "*.spec" }

    # Run PyInstaller
    pyinstaller --onefile `
        --name netsentinel-engine `
        --distpath ..\resources `
        --hidden-import=uvicorn.logging `
        --hidden-import=uvicorn.loops.auto `
        --hidden-import=uvicorn.protocols.http.auto `
        --add-data "app;app" `
        app\main.py

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: PyInstaller build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  Python engine built successfully" -ForegroundColor Green
} else {
    Write-Host "[1/3] Skipping Python build" -ForegroundColor Yellow
}

# 2. Build Angular renderer
Write-Host "[2/3] Building Angular renderer..." -ForegroundColor Yellow
Set-Location -Path $PSScriptRoot\..
npm run build:renderer
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Angular build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  Angular renderer built" -ForegroundColor Green

# 3. Package Electron app
Write-Host "[3/3] Packaging Electron app with electron-builder..." -ForegroundColor Yellow
npm run build:electron
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: electron-builder failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Cyan
Write-Host "Installers are in the 'release/' directory"
