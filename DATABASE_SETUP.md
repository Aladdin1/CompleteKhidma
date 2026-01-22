# Database Setup Guide

## Issue: "Database service is not available"

Task creation requires **PostgreSQL** to be running. This guide will help you set it up.

## Quick Options

### ✅ Option 1: Docker Desktop (Recommended - Easiest)

**Steps:**
1. Download and install Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Start Docker Desktop
3. Open PowerShell and run:
   ```powershell
   cd c:\Work\Projects\lahlouba
   docker-compose up -d postgres redis
   ```
4. Wait ~10 seconds for services to start
5. Run database migrations:
   ```powershell
   cd backend
   npm run migrate
   ```
6. Restart backend server (if it's running)

**Verify:**
```powershell
docker-compose ps
```
Should show `postgres` and `redis` as "healthy"

---

### Option 2: Install PostgreSQL Locally

**Steps:**
1. Download PostgreSQL for Windows: https://www.postgresql.org/download/windows/
2. Install with default settings
   - Remember the password you set for `postgres` user
   - Default port: 5432
3. Open pgAdmin or psql and create database:
   ```sql
   CREATE DATABASE khidma_db;
   CREATE USER khidma WITH PASSWORD 'khidma';
   GRANT ALL PRIVILEGES ON DATABASE khidma_db TO khidma;
   ```
4. Update `backend/.env` if needed:
   ```env
   DB_PASSWORD=your_postgres_password
   ```
5. Run migrations:
   ```powershell
   cd backend
   npm run migrate
   ```
6. Restart backend server

---

### Option 3: Use Free Cloud PostgreSQL

**Recommended Services:**
- **Supabase**: https://supabase.com (Free tier, easy setup)
- **Neon**: https://neon.tech (Serverless PostgreSQL, free tier)
- **Railway**: https://railway.app (Free tier available)

**Steps:**
1. Sign up for a free account
2. Create a new PostgreSQL database
3. Get connection string (format: `postgresql://user:password@host:port/dbname`)
4. Update `backend/.env`:
   ```env
   DATABASE_URL=postgresql://user:password@host:port/dbname
   ```
5. Run migrations:
   ```powershell
   cd backend
   npm run migrate
   ```
6. Restart backend server

---

## After Setup

### Verify Database Connection

```powershell
# Test connection (if psql is installed)
psql -h localhost -U khidma -d khidma_db -c "SELECT 1;"
```

Or check backend logs - should see:
```
✅ Database connection verified
```

### Run Migrations

```powershell
cd c:\Work\Projects\lahlouba\backend
npm run migrate
```

This creates all required tables:
- users
- tasks
- task_state_events
- task_applications
- user_verifications
- user_devices
- etc.

### Test Task Creation

1. Make sure backend is running: `npm run dev`
2. Open frontend: http://localhost:5173
3. Login with phone OTP
4. Try creating a task - should work now! ✅

---

## Current Status

✅ **Working without database:**
- User authentication (OTP login)
- User profile viewing/editing

❌ **Requires database:**
- Task creation
- Task listing
- Task details
- Task applications
- All task-related features

---

## Troubleshooting

### "Cannot connect to database"

1. **Check if PostgreSQL is running:**
   ```powershell
   # For Docker:
   docker-compose ps
   
   # For local PostgreSQL:
   Get-Service postgresql*
   ```

2. **Check connection settings in `backend/.env`:**
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=khidma_db
   DB_USER=khidma
   DB_PASSWORD=khidma
   ```

3. **Check port 5432 is not blocked by firewall**

### "Relation does not exist" or table errors

Run migrations:
```powershell
cd backend
npm run migrate
```

### Docker containers not starting

```powershell
# Check logs
docker-compose logs postgres

# Restart containers
docker-compose restart postgres redis
```

---

## Quick Start (Once Database is Ready)

```powershell
# 1. Start database (Docker)
cd c:\Work\Projects\lahlouba
docker-compose up -d postgres redis

# 2. Run migrations
cd backend
npm run migrate

# 3. Start backend
npm run dev

# 4. Start frontend (in another terminal)
cd ../frontend
npm run dev

# 5. Open browser
# http://localhost:5173
```

Now you can create tasks! 🎉
