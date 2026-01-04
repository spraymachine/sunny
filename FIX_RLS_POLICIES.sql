-- =====================================================
-- FIX RLS POLICIES - Run this in Supabase SQL Editor
-- =====================================================

-- 1. Drop the circular RLS policies that were causing infinite loading
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

DROP POLICY IF EXISTS "Admins can read trainers" ON public.trainers;
DROP POLICY IF EXISTS "Admins can insert trainers" ON public.trainers;
DROP POLICY IF EXISTS "Admins can update trainers" ON public.trainers;
DROP POLICY IF EXISTS "Admins can delete trainers" ON public.trainers;

DROP POLICY IF EXISTS "Admins can read sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;

DROP POLICY IF EXISTS "Admins can read leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.leads;

-- 2. Create new RLS policies that work without circular dependencies

-- PROFILES: Users can read their own profile (no admin check needed)
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- For admin operations (insert/delete), you can manually grant via service role or remove RLS temporarily
-- For now, these tables allow authenticated users to read (data is public dashboard view):

-- TRAINERS: All authenticated users can read
CREATE POLICY "Authenticated users can read trainers"
  ON public.trainers FOR SELECT
  USING (auth.role() = 'authenticated');

-- SALES: All authenticated users can read
CREATE POLICY "Authenticated users can read sales"
  ON public.sales FOR SELECT
  USING (auth.role() = 'authenticated');

-- LEADS: All authenticated users can read
CREATE POLICY "Authenticated users can read leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated');

-- NOTE: If you need strict admin-only access, modify these policies to check the role column:
-- CREATE POLICY "Only admins can read sales"
--   ON public.sales FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );
-- But this requires profiles to load first, so test with the simpler version above.

