-- =============================================
-- SUNNY BREAD SALES ADMIN DASHBOARD
-- Supabase SQL Schema + RLS Policies
-- =============================================

-- 1. PROFILES TABLE
-- Stores user profiles with role information
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text check (role in ('admin', 'trainer')) default 'trainer',
  created_at timestamptz default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- RLS Policy: Only admins can read profiles
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can insert profiles
create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can update profiles
create policy "Admins can update profiles"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can delete profiles
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 2. TRAINERS TABLE
create table if not exists public.trainers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  created_at timestamptz default now()
);

-- Enable RLS on trainers
alter table public.trainers enable row level security;

-- RLS Policy: Only admins can read trainers
create policy "Admins can read trainers"
  on public.trainers for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can insert trainers
create policy "Admins can insert trainers"
  on public.trainers for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can update trainers
create policy "Admins can update trainers"
  on public.trainers for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can delete trainers
create policy "Admins can delete trainers"
  on public.trainers for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 3. SALES TABLE
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.trainers(id) on delete cascade,
  buyer_name text,
  buyer_contact text,
  units_assigned int default 0,
  units_sold int default 0,
  margin_percentage numeric default 0,
  incentive_amount numeric default 0,
  expiry_date date,
  created_at timestamptz default now()
);

-- Enable RLS on sales
alter table public.sales enable row level security;

-- RLS Policy: Only admins can read sales
create policy "Admins can read sales"
  on public.sales for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can insert sales
create policy "Admins can insert sales"
  on public.sales for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can update sales
create policy "Admins can update sales"
  on public.sales for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can delete sales
create policy "Admins can delete sales"
  on public.sales for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. LEADS TABLE
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.trainers(id) on delete cascade,
  trainer_contact text,
  buyer_name text,
  buyer_contact text,
  status text check (status in ('new', 'converted', 'lost')) default 'new',
  created_at timestamptz default now()
);

-- Enable RLS on leads
alter table public.leads enable row level security;

-- RLS Policy: Only admins can read leads
create policy "Admins can read leads"
  on public.leads for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can insert leads
create policy "Admins can insert leads"
  on public.leads for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can update leads
create policy "Admins can update leads"
  on public.leads for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- RLS Policy: Only admins can delete leads
create policy "Admins can delete leads"
  on public.leads for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- =============================================
-- VIEWS FOR BUSINESS LOGIC
-- =============================================

-- View: Trainer Rankings by Units Sold
create or replace view public.trainer_rankings as
select
  t.id as trainer_id,
  t.name as trainer_name,
  t.contact as trainer_contact,
  coalesce(sum(s.units_sold), 0) as total_units_sold,
  coalesce(sum(s.units_assigned), 0) as total_units_assigned,
  coalesce(sum(s.incentive_amount), 0) as total_incentive,
  rank() over (order by coalesce(sum(s.units_sold), 0) desc) as rank
from public.trainers t
left join public.sales s on t.id = s.trainer_id
group by t.id, t.name, t.contact;

-- View: Expiry Alerts (items expiring within 3 days with unsold stock)
create or replace view public.expiry_alerts as
select
  s.id as sale_id,
  s.trainer_id,
  t.name as trainer_name,
  t.contact as trainer_contact,
  s.buyer_name,
  s.units_assigned,
  s.units_sold,
  (s.units_assigned - s.units_sold) as unsold_units,
  s.expiry_date,
  (s.expiry_date - current_date) as days_until_expiry,
  case
    when (s.expiry_date - current_date) <= 1 then 'red'
    when (s.expiry_date - current_date) = 2 then 'yellow'
    else 'green'
  end as alert_status
from public.sales s
join public.trainers t on s.trainer_id = t.id
where s.units_assigned > s.units_sold;

-- =============================================
-- FUNCTION: Create profile on user signup
-- =============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'trainer')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: Auto-create profile on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- INITIAL ADMIN SETUP
-- Run this after creating your first user via Supabase Auth
-- Replace 'YOUR_USER_ID' with the actual user ID
-- =============================================
-- update public.profiles set role = 'admin' where id = 'YOUR_USER_ID';

