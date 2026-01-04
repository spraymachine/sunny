-- =====================================================
-- FIX PROFILE RLS - Allow users to read their own profile
-- This fixes the circular dependency issue
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop the existing circular policy
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Create policy that allows users to read their OWN profile
-- This breaks the circular dependency - users can check their own role
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Keep admin-only policies for other operations (insert/update/delete)
-- But allow users to update their own profile name/email (not role)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
  
-- Note: To prevent users from changing their own role, we'll use a trigger
-- RLS policies cannot reference OLD/NEW values directly
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent users from changing their own role
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Users cannot change their own role. Contact an administrator.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS prevent_role_change_trigger ON public.profiles;
CREATE TRIGGER prevent_role_change_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION public.prevent_role_change();

-- Admin-only policies for insert/delete (use service role for these)
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;

-- Note: Profile creation is handled by the trigger function handle_new_user()
-- which uses SECURITY DEFINER, so it bypasses RLS

-- =====================================================
-- IMPORTANT: After running this, make sure your user has admin role
-- Run this query (replace YOUR_USER_ID with actual user ID from auth.users):
-- =====================================================
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_USER_ID';
-- 
-- To find your user ID, check auth.users table or use:
-- SELECT id, email FROM auth.users;

