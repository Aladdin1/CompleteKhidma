# How to Login as a Tasker

By default, new users are created with the role `client`. To use tasker features, you need to change your user role to `tasker`.

## Method 1: Update via PostgreSQL (Quickest)

### Using psql (Command Line)

```powershell
# Connect to PostgreSQL
docker exec -it khidma-postgres psql -U khidma -d khidma_db

# Find your user (by phone number)
SELECT id, phone, role FROM users WHERE phone = '+201234567890';

# Update user role to tasker
UPDATE users SET role = 'tasker' WHERE phone = '+201234567890';

# Create tasker profile
INSERT INTO tasker_profiles (user_id, status, rating_avg, rating_count, acceptance_rate, completion_rate)
VALUES (
  (SELECT id FROM users WHERE phone = '+201234567890'),
  'applied',
  0,
  0,
  0,
  0
)
ON CONFLICT (user_id) DO NOTHING;

# Create default service area (optional)
INSERT INTO tasker_service_areas (tasker_id, center_lat, center_lng, radius_km)
VALUES (
  (SELECT id FROM users WHERE phone = '+201234567890'),
  30.0444,  -- Cairo latitude
  31.2357,  -- Cairo longitude
  10        -- 10 km radius
)
ON CONFLICT (tasker_id) DO NOTHING;

# Exit psql
\q
```

### Using pgAdmin (GUI)

1. Open pgAdmin and connect to the database
2. Navigate to: `khidma_db` → `Schemas` → `public` → `Tables` → `users`
3. Right-click → View/Edit Data → All Rows
4. Find your user row (by phone number)
5. Change `role` column from `client` to `tasker`
6. Save changes
7. Also create a tasker profile in `tasker_profiles` table

## Method 2: Using the Frontend (After Implementing)

A "Become a Tasker" button can be added to the frontend that calls an endpoint to switch roles.

## Method 3: Direct SQL Query

```sql
-- Replace 'YOUR_PHONE_NUMBER' with your actual phone number
UPDATE users 
SET role = 'tasker' 
WHERE phone = '+201234567890';

-- Create tasker profile if it doesn't exist
INSERT INTO tasker_profiles (user_id, status, rating_avg, rating_count, acceptance_rate, completion_rate)
SELECT id, 'applied', 0, 0, 0, 0
FROM users
WHERE phone = '+201234567890'
ON CONFLICT (user_id) DO NOTHING;

-- Add default service area
INSERT INTO tasker_service_areas (tasker_id, center_lat, center_lng, radius_km)
SELECT id, 30.0444, 31.2357, 10
FROM users
WHERE phone = '+201234567890'
ON CONFLICT (tasker_id) DO NOTHING;
```

## After Changing Role

1. **Logout** from the frontend
2. **Login again** with the same phone number
3. You should now see tasker navigation links
4. Navigate to `/tasker` to see the tasker dashboard
5. Complete your tasker profile at `/tasker/profile`

## Verify It Worked

After logging in, check:
- Navigation shows tasker links (لوحة المهمات, المهام المتاحة, عروضي)
- You can access `/tasker` dashboard
- You can view available tasks at `/tasker/tasks/available`

## Notes

- Changing role only affects future logins (need to logout/login)
- Tasker profile is required to use tasker features
- Service area must be configured to see available tasks
- You need to add categories to your profile to match tasks
