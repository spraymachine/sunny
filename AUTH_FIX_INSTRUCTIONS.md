# Authentication Timeout Fix

## Problem
After logging in, users are being kicked out with "You don't have admin privileges" message. This is caused by a circular dependency in the RLS (Row Level Security) policies.

## Root Cause
The `profiles` table has an RLS policy that says "Only admins can read profiles". However, to check if a user is an admin, the system needs to read their profile from the `profiles` table. This creates a chicken-and-egg problem:
- User can't read their profile to check if they're admin
- But they need to be admin to read profiles

## Solution

### Step 1: Fix RLS Policies (REQUIRED)
Run the SQL script `FIX_PROFILE_RLS.sql` in your Supabase SQL Editor. This will:
- Allow users to read their OWN profile (breaking the circular dependency)
- Allow users to update their own profile (but not change their role)
- Keep admin-only policies for insert/delete operations

### Step 2: Set Admin Role
After running the SQL fix, make sure your user has the admin role:

```sql
-- Find your user ID first
SELECT id, email FROM auth.users;

-- Then set admin role (replace YOUR_USER_ID with actual ID)
UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';
```

### Step 3: Code Changes (Already Applied)
The following code changes have been made:
1. **AuthContext.jsx**: Improved profile loading with better error handling
2. **ProtectedRoute.jsx**: Better handling of profile loading states and clearer error messages

## Testing
1. Run the SQL fix in Supabase
2. Set your user's role to 'admin'
3. Log out and log back in
4. You should now be able to access the dashboard without being kicked out

## Notes
- The frontend code now handles profile loading failures more gracefully
- If profile loading fails, you'll see a helpful error message pointing to the SQL fix
- Once the RLS policy is fixed, profile loading should work correctly


