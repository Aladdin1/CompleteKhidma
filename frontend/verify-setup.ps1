# Frontend Setup Verification Script
# Run this script to check if everything is ready

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "KHIDMA Frontend - Setup Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Node.js found: $nodeVersion" -ForegroundColor Green
        
        # Check version
        $versionNumber = $nodeVersion -replace 'v', '' -split '\.' | Select-Object -First 1
        if ([int]$versionNumber -lt 18) {
            $warnings += "Node.js version is $nodeVersion. Version 18+ is recommended."
        }
    } else {
        throw "Node.js not found"
    }
} catch {
    $errors += "Node.js is not installed or not in PATH"
    Write-Host "  ✗ Node.js not found" -ForegroundColor Red
    Write-Host "    Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
}

Write-Host ""

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ npm found: v$npmVersion" -ForegroundColor Green
    } else {
        throw "npm not found"
    }
} catch {
    $errors += "npm is not installed or not in PATH"
    Write-Host "  ✗ npm not found" -ForegroundColor Red
}

Write-Host ""

# Check if node_modules exists
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "  ✓ Dependencies installed (node_modules exists)" -ForegroundColor Green
} else {
    $warnings += "Dependencies not installed. Run 'npm install' first."
    Write-Host "  ⚠ Dependencies not installed" -ForegroundColor Yellow
    Write-Host "    Run: npm install" -ForegroundColor Yellow
}

Write-Host ""

# Check package.json
Write-Host "Checking package.json..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "  ✓ package.json found" -ForegroundColor Green
} else {
    $errors += "package.json not found"
    Write-Host "  ✗ package.json not found" -ForegroundColor Red
}

Write-Host ""

# Check if backend might be running
Write-Host "Checking backend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Backend is running on port 3000" -ForegroundColor Green
    }
} catch {
    $warnings += "Backend not detected on port 3000. Make sure backend is running."
    Write-Host "  ⚠ Backend not detected on port 3000" -ForegroundColor Yellow
    Write-Host "    Start backend with: cd ..\backend && npm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

# Summary
if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✓ All checks passed! Ready to run." -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the frontend:" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor White
    exit 0
} elseif ($errors.Count -eq 0) {
    Write-Host "⚠ Setup complete with warnings:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  - $warning" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "You can still try to run, but some features may not work." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✗ Setup incomplete. Please fix the following:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "See SETUP_INSTRUCTIONS.md for detailed setup guide." -ForegroundColor Yellow
    exit 1
}
