# Sunny — One-shot Master Prompt (copy/paste into an agentic AI)

Below is a single prompt designed to generate Sunny end-to-end (frontend + Supabase SQL/RLS + storage policies) in one run.

---

## MASTER PROMPT (copy everything inside the code block)

```text
You are building a production-grade web app called **Sunny**.

## 0) Output expectations
- Generate a complete repo with a working SPA frontend and a Supabase backend setup.
- Include a single idempotent SQL script that sets up **all** required Postgres objects: tables, columns, indexes, views, functions, triggers, and RLS policies.
- Do not include any secrets. Use environment variables.
- Match the route hierarchy, roles, and behavior described below.

## 1) Tech stack (must use)
- Frontend: React 19 + Vite 7, React Router DOM 7, Tailwind CSS 4, Recharts 3
- Backend: Supabase (Auth + Postgres + RLS + Storage)
- Deployable to GitHub Pages under subpath `/sunny` (router basename `/sunny`)

## 2) Roles (must implement)
Roles live in `public.profiles.role` (enum):
- `admin`
- `sales`
- `partner`

Authorization rules:
- Admin: full access to all admin pages and all data; can read audit logs.
- Sales: can access admin pages but cannot open audit logs page.
- Partner: can access partner pages only; can only read/write their own data as enforced by RLS.

## 3) Routes (must match exactly)
Public:
- `/login`

Admin area (roles: admin|sales):
- `/admin/overview`
- `/admin/sales`
- `/admin/cta`
- `/admin/onboarding`
- `/admin/invitations`
- `/admin/audit-logs` (admin only)

Partner area (role: partner):
- `/partner/dashboard`
- `/partner/invitations`
- `/partner/profile`

## 4) UX / Features (must implement)

### Login
- Email/password login using Supabase Auth.
- After sign-in: fetch `profiles.role` and redirect:
  - admin → `/admin/overview`
  - sales → `/admin/sales`
  - partner → `/partner/dashboard`

### Admin Overview (`/admin/overview`)
- Show a chart + list of Top Partners by sales using view `public.trainer_rankings`.
- Show partner directory (trainers) with CRUD (add/edit/delete).
- Fields for partner: name (required), contact, notes, joining date (stored as `trainers.created_at`).
- Click-to-call partner via `tel:` link.
- Create/update/delete trainer writes an audit log row.

### Admin Sales (`/admin/sales`)
Two modules:
1) Leads
  - Fields: `trainer_id` (required), `trainer_contact` (optional), `buyer_name` (required), `buyer_contact` (optional), `status` (new/converted/lost), optional notes.
  - Search + filters + KPIs.
  - CRUD actions write audit log rows.
2) Sales assignments
  - Fields: `trainer_id`, `units_assigned`, `units_sold`, `retracted_units`, `date_of_assignment`, plus optional customer fields: `buyer_name`, `buyer_contact`.
  - Business rule: units_sold + retracted_units <= units_assigned.
  - “Retract” flow increments `retracted_units` and writes audit log entity_type=`retract`.
  - CRUD actions write audit log rows.

### CTA Dashboard (`/admin/cta`)
- Show cards for sale rows where unsold units > 0.
- Only show cards within 0–7 days since `date_of_assignment`.
- Status buckets:
  - green: 0–2 days
  - red: 3–7 days
- Filters: partner, color, date range.
- Click-to-call partner.

### Onboarding (`/admin/onboarding`)
- Admin: can create `partner` and `sales` users.
- Sales: can create `partner` users only.
- Inputs: role (admin-only), email, password, full_name, date_of_birth, phone_number, notes.
- Must create both Supabase Auth user and `public.profiles` row.
- Must restore the creator’s session after creating another user (no permanent logout).
- IMPORTANT security: implement user-creation via Supabase Edge Function (preferred) or clearly separate “dev-only” approach. Never embed service-role keys in frontend.

### Invitations (`/admin/invitations` and `/partner/invitations`)
Admin/Sales:
- Create invitation: select partner + units_offered + optional message.
- System creates an order (status `pending`) if needed and then creates `order_invitations` row.
- List all invitations with partner, units, status, invited_by, created date.

Partner:
- List own invitations.
- Accept/decline updates invitation status + responded_at.
- When accepted, update the related `orders` row so partner KPIs reflect the allocation:
  - orders.units_assigned += invitations.units_offered
  - orders.status becomes `active`
  - orders.updated_at updated
Implement this as a database trigger on invitation acceptance.

### Audit logs (`/admin/audit-logs`) admin-only
- Table viewer over `public.audit_logs` with filters: action_type (CREATE/UPDATE/DELETE), entity_type.
- Pagination.
- Description supports a two-part format separated by `\" | \"`.

### Partner dashboard (`/partner/dashboard`)
- Identify the partner’s trainer record by matching `trainers.name == profiles.full_name`.
- If none exists, partner can create their own trainer record on first action (subject to RLS identity matching).
- Partner can add/edit customer purchase details tied to their sales rows:
  - buyer_name, buyer_contact, units_purchased -> sales.units_sold, purchase_date, notes -> sales.customer_notes
  - upload photo to Storage bucket `customer-pictures` and store public URL in sales.picture_url

### Partner profile (`/partner/profile`)
- Read-only KPI rollups from `public.orders`:
  - total units assigned, sold, retracted, remaining, total revenue, number of orders.
- Display profile info from `public.profiles`.

## 5) Database contract (must implement)

### Enum
- `user_role_enum` with values: admin, sales, partner

### Tables and columns (must include all listed columns)

`public.profiles`:
- id uuid PK FK auth.users(id) on delete cascade
- email text, full_name text
- role user_role_enum default partner
- date_of_birth date, phone_number text, notes text
- created_at timestamptz default now(), updated_at timestamptz default now()

`public.trainers`:
- id uuid PK default gen_random_uuid()
- name text not null
- contact text, notes text
- created_at timestamptz default now()

`public.sales`:
- id uuid PK default gen_random_uuid()
- trainer_id uuid references public.trainers(id) on delete cascade
- units_assigned int default 0
- units_sold int default 0
- retracted_units int default 0
- date_of_assignment date default current_date
- purchase_date date
- buyer_name text
- buyer_contact text
- picture_url text
- qr_code_url text
- customer_notes text
- created_at timestamptz default now()

`public.leads`:
- id uuid PK default gen_random_uuid()
- trainer_id uuid references public.trainers(id) on delete set null
- trainer_contact text
- buyer_name text not null
- buyer_contact text
- status text default 'new'
- notes text
- created_at timestamptz default now()

`public.audit_logs`:
- id uuid PK default gen_random_uuid()
- user_id uuid references auth.users(id) on delete set null
- user_name text
- action_type text check in ('CREATE','UPDATE','DELETE')
- entity_type text
- entity_id uuid
- description text
- old_values jsonb, new_values jsonb, metadata jsonb
- created_at timestamptz default now()

`public.orders`:
- id uuid PK default gen_random_uuid()
- partner_id uuid references public.profiles(id) on delete cascade
- units_assigned int default 0
- units_sold int default 0
- units_retracted int default 0
- unit_price numeric default 100
- status text check in ('pending','active','completed','cancelled') default 'active'
- assigned_at timestamptz default now()
- created_at timestamptz default now()
- updated_at timestamptz default now()

`public.order_invitations`:
- id uuid PK default gen_random_uuid()
- order_id uuid references public.orders(id) on delete cascade
- partner_id uuid references public.profiles(id) on delete cascade
- invited_by uuid references public.profiles(id) on delete set null
- units_offered int not null
- message text
- status text check in ('pending','accepted','declined') default 'pending'
- created_at timestamptz default now()
- responded_at timestamptz
- expires_at timestamptz

### Required indexes
- sales(trainer_id)
- leads(trainer_id)
- orders(partner_id)
- order_invitations(partner_id)
- audit_logs(user_id)
- audit_logs(created_at desc)

### Required view
Create `public.trainer_rankings`:
- columns: trainer_id, trainer_name, trainer_contact, total_units_assigned, total_units_sold, rank
- definition: aggregate sales by trainer and dense_rank by total_units_sold desc

### Required functions/triggers
Helper functions (security definer, stable):
- is_admin(), is_sales(), is_partner(), is_admin_or_sales(), is_service_role()

Triggers:
- handle_new_user(): after insert on auth.users, insert into public.profiles (map role from raw_user_meta_data.role, default partner). Never block signup on failure.
- prevent_role_change(): before update on public.profiles when role changes; allow only service role, unauth context, admin, or short onboarding window.
- apply_invitation_acceptance(): after update on order_invitations, when status changes to accepted, update orders.units_assigned += units_offered and set order status active + updated_at.

### RLS policies (must enforce)
Enable RLS on all tables and create policies:

profiles:
- select: own OR admin OR sales
- insert: service role/triggers OR admin OR (sales inserting partner) OR self
- update: own OR admin OR (sales updating partner profiles)
- delete: admin deleting non-admin OR sales deleting partner profiles

trainers:
- select: admin/sales OR partner
- insert: admin/sales OR partner only if inserted trainer identity matches their profile (name/contact matches full_name/phone/email)
- update/delete: admin/sales only

sales:
- admin/sales: full CRUD
- partner: CRUD only where sale belongs to them via trainer/profile identity match

leads:
- admin/sales: full CRUD
- partner: no access

audit_logs:
- select: admin only
- insert: any authenticated user

orders:
- admin/sales: full CRUD except delete admin-only
- partner: select own; update own if needed

order_invitations:
- admin/sales: full CRUD
- partner: select own; update own invitations (respond)

## 6) Storage
- Create bucket: `customer-pictures`.
- Create safe storage policies. Prefer user-scoped object keys (`auth.uid()/filename`) so partners can only access their own images.

## 7) Deliverables checklist
- Working React app with all routes and pages.
- Auth context (session + profile loading).
- Role-based route protection and role-based nav.
- Supabase SQL script (single file) that is idempotent and sets up everything.
- Minimal README explaining setup and deployment.
```

---

## Where the source docs live in this repo
- `PRD_SUNNY.md`
- `TECH_STACK_SUNNY.md`
- `DB_SCHEMA_SUNNY.md`

