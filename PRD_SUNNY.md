# Sunny — Product Requirements Document (PRD)

## Product summary
- **Product name**: Sunny
- **Product type**: Role-based web CRM + operations dashboard
- **Primary users**: Admin, Sales, Partner
- **Core outcomes**:
  - Admin/Sales can manage partners, leads, unit allocations, and operational alerts.
  - Partners can record customer purchases (incl. photo proof) and respond to invitations.
  - System keeps an **audit trail** for key CRUD operations.

## Problem statement
The business needs a lightweight system to manage a partner network and sales operations:
- Maintain a partner directory (contact + notes).
- Assign “units” to partners and track progress (sold vs retracted vs remaining).
- Track leads/customers and conversion outcomes.
- Surface “CTA” alerts when units remain unsold shortly after assignment.
- Allow partners to upload customer evidence (photo) and customer purchase details.
- Ensure **data access is secure** and role-correct (enforced by database RLS).

## Goals
- **Operational clarity**: Always know which partners have unsold allocations and need follow-up.
- **Fast CRM**: Simple create/update flows for leads and assignments with minimal friction.
- **Self-service**: Partners can update their own customer/purchase info without admin involvement.
- **Security by default**: Backend RLS is the source of truth for access control.
- **Auditability**: CRUD actions on core entities produce readable audit logs.

## Non-goals (v1)
- Multi-tenant organizations or complex RBAC beyond 3 roles.
- Billing/invoicing.
- In-app calling/SMS/WhatsApp; only `tel:` links.
- Deep analytics, forecasting, or advanced ETL.

## Personas & roles

### Admin
- Full access to admin pages and all data.
- Can view audit logs.
- Can create **partner** and **sales** users.

### Sales
- Can use all admin pages except audit logs.
- Can manage partners, leads, assignments, invitations.
- Can create **partner** users (not admin).

### Partner
- Can access partner pages only.
- Can only view/update data that belongs to them as enforced by RLS.
- Can upload customer picture proof.

## Information architecture (routes)
The app is a single-page app (SPA) with role-based route protection.

### Public
- `/login`

### Admin area (Admin + Sales)
- `/admin/overview` — partner leaderboard + partner directory CRUD
- `/admin/sales` — leads + sales assignments + retractions
- `/admin/cta` — CTA alert dashboard (0–7 day view of unsold units)
- `/admin/onboarding` — create new users (role depends on creator)
- `/admin/invitations` — manage invitations
- `/admin/audit-logs` — audit viewer (**Admin only**)

### Partner area (Partner only)
- `/partner/dashboard` — manage own customer/purchase updates + photo upload
- `/partner/invitations` — invitation inbox (accept/decline)
- `/partner/profile` — own KPIs + profile info

## Core entities (product language)
- **User profile**: identity + role + contact fields (mapped to `public.profiles`).
- **Partner (trainer)**: operational partner directory record (mapped to `public.trainers`).
- **Lead**: customer lead and conversion status (mapped to `public.leads`).
- **Sale assignment**: allocation row tracking units assigned/sold/retracted plus customer purchase details (mapped to `public.sales`).
- **Order**: partner-level allocation record used for partner KPI rollups and invitations (mapped to `public.orders`).
- **Order invitation**: a request offering units to a partner with accept/decline workflow (mapped to `public.order_invitations`).
- **Audit log**: append-only trail of changes (mapped to `public.audit_logs`).

## Permissions (high-level)
- **Admin**: full access to all tables and pages, plus read audit logs.
- **Sales**: full access to operational tables; no audit log viewing.
- **Partner**:
  - can read/CRUD **only their own** sales and related self-owned data
  - cannot access leads globally
  - can read invitations addressed to them and respond

## Functional requirements (by page)

### 1) Login (`/login`)
- **Inputs**: email, password.
- **Behavior**:
  - Authenticate via Supabase Auth.
  - After sign-in, read `public.profiles.role` and redirect:
    - `admin` → `/admin/overview`
    - `sales` → `/admin/sales`
    - `partner` → `/partner/dashboard`
- **Failure states**:
  - Invalid creds: show error.
  - Profile missing / RLS blocked: show a clear remediation message.

### 2) Admin Overview (`/admin/overview`)
- **Partner leaderboard**
  - Shows top partners by total units sold.
  - Uses a database view (recommended): `public.trainer_rankings`.
  - Required fields in ranking rows:
    - `trainer_id`, `trainer_name`, `trainer_contact`
    - `total_units_sold`, `total_units_assigned`, `rank`
- **Partner directory**
  - List all partners with joining date, notes, and derived totals.
  - **CRUD partner (trainer)**:
    - Add/Edit fields: name (required), contact, notes, joining_date.
    - joining_date maps to `trainers.created_at` (timestamp).
  - Actions:
    - Click-to-call (from contact).
    - Edit, Delete.
- **Audit**:
  - Create/update/delete trainer writes an `audit_logs` row.

### 3) Admin Sales CRM (`/admin/sales`)
Contains two operational modules: **Leads** and **Sales assignments**.

#### Leads module
- List, search, filter by status and partner.
- KPIs: total/new/converted/lost + conversion rate.
- **Lead create/edit** fields:
  - partner selection (`trainer_id`) required
  - partner contact (`trainer_contact`) optional (used for convenience)
  - buyer name (`buyer_name`) required
  - buyer contact (`buyer_contact`) optional
  - status (`new|converted|lost`)
- Actions:
  - call buyer
  - edit/delete lead
- Audit:
  - Create/update/delete lead writes an `audit_logs` row.

#### Sales assignments module
- List, search, filter by partner; support sorting.
- **Sale assignment create/edit** fields:
  - partner selection (`trainer_id`)
  - `units_assigned` required (integer >= 0)
  - `date_of_assignment` required (date)
  - optional: `units_sold` (integer >= 0)
  - optional: `retracted_units` (integer >= 0)
  - optional customer fields: `buyer_name`, `buyer_contact`
- Business rules:
  - \(units\_sold + retracted\_units \le units\_assigned\)
  - remaining/unsold = `units_assigned - units_sold - retracted_units`
- Retraction flow:
  - “Add retract” increases `retracted_units` on a sale row.
  - The retract action must also be audited (entity type `retract`).
- Audit:
  - Create/update/delete sale writes an `audit_logs` row.

### 4) CTA Dashboard (`/admin/cta`)
- Purpose: operational follow-up view of **unsold units** in a short window.
- Data source: sales rows where remaining/unsold units > 0.
- Constraints:
  - show only sales within **0–7 days** since `date_of_assignment`.
- Buckets:
  - **Green**: 0–2 days since assignment
  - **Red**: 3–7 days since assignment
- Filters:
  - partner filter
  - color filter
  - date range filter (assignment date)
- Actions:
  - click-to-call partner contact

### 5) Onboarding (`/admin/onboarding`)
- Admin/Sales can create partner users; Admin can also create sales users.
- Inputs:
  - role (admin-only selector): `partner|sales`
  - email, password
  - full_name, date_of_birth, phone_number, notes
- Requirements:
  - Create user in Supabase Auth and create corresponding `public.profiles` row.
  - Ensure the creator remains logged in (session restore flow).
- Security:
  - If using `supabase.auth.admin.*`, this must run in a trusted backend/Edge Function in production.

### 6) Invitations (`/admin/invitations`, `/partner/invitations`)

#### Admin/Sales view
- List all invitations with partner, units, status, invited_by, created_at.
- Create invitation:
  - select partner
  - input units_offered
  - optional message
  - system creates an `orders` row if none exists for that workflow (status `pending`) and then creates `order_invitations`.

#### Partner view
- List own invitations (RLS filters).
- Respond:
  - Accept or Decline.
  - Record `responded_at`.
  - **Acceptance outcome requirement**:
    - When an invitation is accepted, the corresponding order should be updated to reflect allocation (recommended: `orders.units_assigned += units_offered` and status transitions to `active`).

### 7) Audit logs (`/admin/audit-logs`) — Admin only
- List audit events with filters:
  - action_type: `CREATE|UPDATE|DELETE`
  - entity_type: `trainer|lead|sale|retract` (and potentially others)
- Pagination controls (items per page).
- Render description:
  - support a two-part description separated by `" | "` to display “headline” + “details”.

### 8) Partner Dashboard (`/partner/dashboard`)
- Partner manages customer purchase records tied to their sales rows.
- Flow:
  - System identifies partner’s trainer record via `trainers.name == profiles.full_name`.
  - If missing, partner can create their own trainer record on first action (subject to RLS identity match).
- Customer modal fields:
  - buyer_name, buyer_contact
  - units_purchased (mapped to `sales.units_sold`)
  - purchase_date
  - notes (mapped to `sales.customer_notes`)
  - picture_file upload (stored in Storage and URL stored in `sales.picture_url`)
- Upload:
  - Upload to bucket `customer-pictures`.
  - Store resulting public URL.

### 9) Partner Profile (`/partner/profile`)
- Read-only KPI view computed from `orders`:
  - total units assigned, sold, retracted, remaining, revenue, number of orders.
- Shows profile fields: full_name, email, phone_number, role, created_at.

## Audit logging requirements
- Insert into `public.audit_logs` with snake_case fields:
  - `user_id`, `user_name`, `action_type`, `entity_type`, `entity_id`, `description`, `old_values`, `new_values`, `metadata`.
- Minimum entity types to support: `trainer`, `lead`, `sale`, `retract`.
- `description` may contain `" | "` separator.

## Data quality & validation rules (recommended)
- All “units” must be integer >= 0.
- Enforce remaining units rules on the server (constraint or app logic), not only UI.
- Phone numbers stored as text; normalize for calling by stripping non-digits (except `+`).

## Security requirements
- Backend RLS policies must enforce:
  - Partner cannot read/write other partners’ rows.
  - Sales cannot read audit logs.
- Avoid service role keys in frontend.

## Future enhancements (optional)
- Add dedicated `retractions` table for history instead of a single `retracted_units` counter.
- Add an explicit `partner_id` foreign key on `trainers` (instead of name/contact matching) for stronger ownership semantics.
- Add invitation expiry enforcement (`expires_at`) and automatic status updates.

