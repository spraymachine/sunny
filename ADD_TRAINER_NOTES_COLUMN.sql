-- =====================================================
-- ADD NOTES COLUMN TO TRAINERS TABLE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add notes column to trainers table
ALTER TABLE public.trainers 
ADD COLUMN IF NOT EXISTS notes text;

-- Add comment to document the column
COMMENT ON COLUMN public.trainers.notes IS 'Additional notes or information about the trainer';

