# Check user role in database
Write-Host "=== Checking User Roles in Database ===" -ForegroundColor Cyan
Write-Host ""

docker exec -it khidma-postgres psql -U khidma -d khidma_db -c "SELECT phone, role, created_at FROM users ORDER BY created_at DESC LIMIT 5;"

Write-Host ""
Write-Host "=== Instructions ===" -ForegroundColor Yellow
Write-Host "1. Find your phone number in the list above" -ForegroundColor White
Write-Host "2. Check if 'role' column shows 'tasker'" -ForegroundColor White
Write-Host "3. If it shows 'client', you need to update it" -ForegroundColor White
Write-Host ""
Write-Host "To update role to 'tasker', run:" -ForegroundColor Cyan
Write-Host "  docker exec -it khidma-postgres psql -U khidma -d khidma_db" -ForegroundColor Gray
Write-Host "  UPDATE users SET role = 'tasker' WHERE phone = 'YOUR_PHONE_HERE';" -ForegroundColor Gray
Write-Host "  \q" -ForegroundColor Gray
Write-Host ""
Write-Host "Then logout and login again from the frontend!" -ForegroundColor Green
