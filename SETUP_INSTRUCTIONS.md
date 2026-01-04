# Admin Dashboard - Setup & CRUD Instructions

## Step 1: Fix RLS Policies in Supabase

Run the SQL from `UPDATE_RLS_FOR_CRUD.sql` in Supabase SQL Editor. This allows admins full CRUD access.

## Step 2: Restart Dev Server

```bash
npm run dev
```

## Step 3: Test the Sales Page

1. Go to `http://localhost:5173/`
2. Login with your admin account
3. Click "Add Sale" button
4. Fill in the form and submit
5. The new sale should appear in the table
6. Click "Edit" to modify a sale
7. Click "Delete" to remove a sale

## What's Working

✅ **Sales Page**: Full CRUD (Create, Read, Update, Delete)
- Add new sales records
- Edit existing sales
- Delete sales
- Real-time table updates
- Expiry alerts
- KPI cards automatically update

## What Still Needs to Be Done

The same CRUD functionality needs to be added to:
- ⏳ **Leads Page** (add, edit, delete leads)
- ⏳ **CTA Page** (manage expiry alerts)
- ⏳ **Trainers Management** (add, edit, delete trainers)

## How the CRUD Works

1. **Add Form Modal** - Click "Add [Item]" button
2. **Form Fields** - Populate all fields
3. **Submit** - Calls Supabase insert/update
4. **Auto Refresh** - Table refreshes with new data
5. **Edit Modal** - Pre-populates form for updating
6. **Delete** - Confirms deletion then removes from DB

## Database

- Trainers table (trainers.id, name, contact)
- Sales table (sales.*, trainer_id ref)
- Leads table (leads.*, trainer_id ref)
- Profiles table (user roles)

All data persists in Supabase and is protected by RLS policies.

## Notes

- Auth is restored and working
- RLS now allows admins full access
- No more infinite loading issues
- Debug logs can be removed from AuthContext when ready


