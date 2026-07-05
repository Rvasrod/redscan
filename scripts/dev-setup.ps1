# NetSentinel Development Setup Script (Windows)
# Run this from the repository root (netsentinel/)

Write-Host "=== NetSentinel Development Setup ===" -ForegroundColor Cyan

# 1. Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js is not installed. Install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js $nodeVersion found" -ForegroundColor Green

# 2. Check Python
Write-Host "[2/5] Checking Python..." -ForegroundColor Yellow
$pythonVersion = python --version 2>$null
if (-not $pythonVersion) {
    Write-Host "ERROR: Python is not installed. Install Python 3.10+ from https://python.org" -ForegroundColor Red
    exit 1
}
Write-Host "  $pythonVersion found" -ForegroundColor Green

# 3. Install Node.js dependencies
Write-Host "[3/5] Installing Node.js dependencies..." -ForegroundColor Yellow
Set-Location -Path $PSScriptRoot\..
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  Node.js dependencies installed" -ForegroundColor Green

# 4. Set up Python virtual environment and install dependencies
Write-Host "[4/5] Setting up Python environment..." -ForegroundColor Yellow
Set-Location -Path $PSScriptRoot\..\engine

if (-not (Test-Path ".venv")) {
    python -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create Python virtual environment" -ForegroundColor Red
        exit 1
    }
}

.\.venv\Scripts\pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pip install failed" -ForegroundColor Red
    exit 1
}

Write-Host "  Python dependencies installed" -ForegroundColor Green

# 5. Check nmap
Write-Host "[5/5] Checking nmap..." -ForegroundColor Yellow
$nmapVersion = nmap --version 2>$null
if (-not $nmapVersion) {
    Write-Host "WARNING: nmap is not installed or not in PATH." -ForegroundColor Yellow
    Write-Host "  Install it from https://nmap.org/download.html" -ForegroundColor Yellow
    Write-Host "  Port scanning and vulnerability detection will not work without nmap." -ForegroundColor Yellow
} else {
    Write-Host "  nmap found" -ForegroundColor Green
}

Set-Location -Path $PSScriptRoot\..

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start development:"
Write-Host "  Terminal 1: npm run dev:python    (starts FastAPI engine on port 8765)"
Write-Host "  Terminal 2: npm run dev           (starts Angular + Electron)"
Write-Host ""
Write-Host "To run tests:"
Write-Host "  Python: cd engine && pytest"
Write-Host "  Angular: npm run test:angular"
