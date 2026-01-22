# Backend Startup Guide

## Issue: "Failed to send OTP"

The backend requires **PostgreSQL** and **Redis** to be running.

## Quick Fix: Start Services with Docker Compose

### Option 1: Using Docker Desktop (Recommended)

1. **Install Docker Desktop** if not installed:
   - Download: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop

2. **Start services:**
   ```powershell
   cd c:\Work\Projects\lahlouba
   docker-compose up -d postgres redis
   ```

3. **Wait for services to be healthy** (~10 seconds)

4. **Start backend:**
   ```powershell
   cd backend
   npm run dev
   ```

### Option 2: Install PostgreSQL and Redis Locally

#### PostgreSQL
1. Download: https://www.postgresql.org/download/windows/
2. Install with default settings
3. Create database:
   ```sql
   CREATE DATABASE khidma_db;
   CREATE USER khidma WITH PASSWORD 'khidma';
   GRANT ALL PRIVILEGES ON DATABASE khidma_db TO khidma;
   ```

#### Redis
1. Download: https://github.com/microsoftarchive/redis/releases
2. Or use WSL: `wsl --install` then `sudo apt install redis-server`
3. Start Redis: `redis-server`

### Option 3: Use Cloud Services (Development)

- **PostgreSQL**: Use a free tier (Supabase, Neon, etc.)
- **Redis**: Use a free tier (Upstash, Redis Cloud, etc.)
- Update `.env` with cloud connection strings

## Verify Services Are Running

### Check PostgreSQL:
```powershell
psql -h localhost -U khidma -d khidma_db -c "SELECT 1;"
```

### Check Redis:
```powershell
redis-cli ping
# Should return: PONG
```

## Start Backend

Once services are running:

```powershell
cd c:\Work\Projects\lahlouba\backend
npm run dev
```

You should see:
```
✅ Database connection verified
✅ Redis connected
🚀 KHIDMA Backend API running on http://localhost:3000
```

## Test Backend

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/health"
```

Should return: `{"status":"ok","service":"khidma-backend",...}`

## Troubleshooting

### "Cannot connect to database"
- Check PostgreSQL is running: `Get-Service postgresql*`
- Verify credentials in `.env`
- Check port 5432 is not blocked

### "Redis connection failed"
- Check Redis is running
- Verify Redis URL in `.env`
- Check port 6379 is not blocked

### "Port 3000 already in use"
- Kill process: `netstat -ano | findstr :3000`
- Or change PORT in `.env`
