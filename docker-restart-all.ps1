# Stop all containers and start all services (postgres, redis, backend)
# Run this in a terminal where Docker works (e.g. PowerShell, or Docker Desktop -> Open in terminal)
# From project root: .\docker-restart-all.ps1

Set-Location $PSScriptRoot

Write-Host "Stopping all containers..." -ForegroundColor Yellow
docker-compose down

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker not reachable. Make sure Docker Desktop is running and run this script from a terminal where 'docker' works." -ForegroundColor Red
    exit 1
}

Write-Host "Starting all services (postgres, redis, backend)..." -ForegroundColor Yellow
docker-compose up -d --build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to start services." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Waiting for postgres and redis to be healthy..." -ForegroundColor Cyan
Start-Sleep -Seconds 15

docker-compose ps
Write-Host ""
Write-Host "Done. Backend API: http://localhost:3000" -ForegroundColor Green
Write-Host "Run frontend separately: cd frontend; npm run dev" -ForegroundColor Green
