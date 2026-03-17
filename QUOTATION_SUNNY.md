# Quotation

**Project:** Sunny — CRM & Operations Dashboard  
**Quotation Date:** 2 March 2025  
**Quotation Valid Until:** 2 April 2025  
**Quotation Reference:** SUNNY-2025-001  

---

## Client Details

| Field | Value |
|-------|-------|
| **Client Name** | _[To be filled]_ |
| **Company / Organisation** | _[To be filled]_ |
| **Contact Person** | _[To be filled]_ |
| **Email** | _[To be filled]_ |
| **Phone** | _[To be filled]_ |
| **Address** | _[To be filled]_ |

---

## Project Summary

Sunny is a role-based web application for managing partner networks, sales assignments, leads, and operational alerts. The system supports three user roles (Admin, Sales, Partner) with role-based access control, audit logging, and partner self-service for customer purchase updates.

---

## Quotation Amount

| Description | Amount (₹) |
|-------------|------------|
| **Total Project Cost** | **₹1,25,000** |
| **GST (if applicable)** | _As per applicable tax laws_ |
| **Grand Total** | **₹1,25,000** |

---

## Scope of Work & Deliverables

### 1. Web Application (Frontend)

| # | Deliverable | Description |
|---|-------------|-------------|
| 1.1 | Login & Authentication | Email/password login with role-based redirect (Admin → Overview, Sales → Sales CRM, Partner → Dashboard) |
| 1.2 | Admin Overview Dashboard | Partner leaderboard (top 5 by sales), partner directory with CRUD, joining date, notes, click-to-call |
| 1.3 | Admin Sales CRM | Leads module (create/edit/delete, status: new/converted/lost, search & filters, KPIs) + Sales assignments module (units assigned/sold/retracted, date of assignment, retraction flow) |
| 1.4 | CTA Dashboard | Traffic-light alerts for unsold units (0–7 days since assignment), green/red buckets, partner & date filters |
| 1.5 | Onboarding | Create partner/sales users with email, password, full name, DOB, phone, notes; session restoration so creator stays logged in |
| 1.6 | Order Invitations | Admin/sales: create invitations (partner, units offered, message); Partner: view & accept/decline invitations |
| 1.7 | Audit Logs (Admin only) | View system activity with filters (action type, entity type), pagination |
| 1.8 | Partner Dashboard | Add/edit customer purchase details (buyer name, contact, units, date, notes), upload customer picture |
| 1.9 | Partner Profile | Read-only KPIs (units assigned/sold/retracted/remaining, revenue) and profile info |
| 1.10 | Responsive UI | Tailwind CSS styling, mobile-friendly layout, consistent components (modals, forms, tables, KPI cards) |

### 2. Backend & Database (Supabase)

| # | Deliverable | Description |
|---|-------------|-------------|
| 2.1 | Database Schema | 7 tables: profiles, trainers, sales, leads, audit_logs, orders, order_invitations with relationships, indexes, enum type |
| 2.2 | Row Level Security (RLS) | 30+ policies enforcing role-based access (admin/sales full access; partner only own data) |
| 2.3 | Triggers & Functions | Auto-create profile on signup; prevent unauthorized role changes; invitation acceptance updates order |
| 2.4 | View | `trainer_rankings` for partner leaderboard |
| 2.5 | Storage | `customer-pictures` bucket for partner uploads with access policies |

### 3. Deployment & Handover

| # | Deliverable | Description |
|---|-------------|-------------|
| 3.1 | Deployment Setup | GitHub Pages deployment config (basename `/sunny`), build scripts |
| 3.2 | Environment Configuration | `.env` template for Supabase URL and anon key |
| 3.3 | Documentation | README with setup steps, schema reference, troubleshooting |
| 3.4 | Source Code Handover | Full repository with clean, commented code |

---

## Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 7, React Router DOM 7, Tailwind CSS 4, Recharts |
| Backend | Supabase (Auth, Postgres, RLS, Storage) |
| Hosting | GitHub Pages (or client-provided static hosting) |

---

## Project Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1: Setup & Core Auth | Week 1 | Database schema, auth, login, role-based routing |
| Phase 2: Admin Features | Week 2 | Overview, Sales CRM, CTA, Onboarding |
| Phase 3: Partner & Invitations | Week 3 | Partner dashboard, invitations, profile |
| Phase 4: Audit, Polish & Deploy | Week 4 | Audit logs, testing, deployment, handover |

**Estimated Delivery:** 4 weeks from project kickoff (subject to client feedback turnaround)

---

## Payment Terms

| Milestone | % | Amount (₹) | Trigger |
|-----------|---|------------|---------|
| Advance / On Signing | 40% | ₹50,000 | Upon acceptance of quotation & signing of agreement |
| Mid-Project | 30% | ₹37,500 | Completion of Admin features (Overview, Sales, CTA, Onboarding) |
| Final | 30% | ₹37,500 | Project completion, deployment, code handover & sign-off |

**Payment Mode:** Bank transfer / UPI  
**Payment Timeline:** Within 7 working days of milestone completion  

---

## Exclusions (Not Included in This Quotation)

- Custom domain setup (client to provide)
- Supabase subscription costs (client’s account)
- User creation via Supabase Admin API in production (recommended: Edge Function; can be quoted separately)
- Post-launch bug fixes beyond 2-week warranty period
- New features or scope changes after sign-off
- Third-party integrations (SMS, WhatsApp, payment gateways)
- Multi-tenant or white-label customisation

---

## Assumptions

1. Client will provide Supabase project credentials (URL, anon key) for development and production.
2. Client will create initial admin user in Supabase Dashboard; first admin profile setup can be done via SQL or onboarding flow.
3. Client will provide timely feedback (within 3–5 working days) on each phase to avoid delays.
4. Hosting will be GitHub Pages or equivalent static hosting; client to configure repo and secrets if using GitHub Actions.
5. All content, branding, and copy are placeholder; client may request minor copy changes during development.

---

## Terms & Conditions

1. **Intellectual Property:** Upon full payment, source code and deliverables become the property of the client.
2. **Warranty:** 2 weeks of bug-fix support from final delivery date for issues arising from delivered scope.
3. **Revisions:** Up to 2 rounds of minor UI/UX revisions per phase; major scope changes will be quoted separately.
4. **Confidentiality:** Project details and client data will be kept confidential.
5. **Force Majeure:** Delays due to circumstances beyond freelancer’s control (e.g., Supabase outages, client unavailability) may extend timeline.

---

## Acceptance

By signing below, the client agrees to the scope, timeline, payment terms, and exclusions outlined in this quotation.

| | |
|---|---|
| **Freelancer** | **Client** |
| Name: _[Your Name]_ | Name: _________________________ |
| Signature: _________________________ | Signature: _________________________ |
| Date: _________________________ | Date: _________________________ |

---

## Contact

**[Your Name]**  
Email: _[Your Email]_  
Phone: _[Your Phone]_  
Address: _[Your Address]_

---

*This quotation is valid until 2 April 2025. Prices and scope are subject to change after this date.*
