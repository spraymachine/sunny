-- Add date_of_assignment column to sales table
-- Run this in Supabase SQL Editor

ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS date_of_assignment DATE DEFAULT CURRENT_DATE;

-- Update existing records to use created_at date if date_of_assignment is null
UPDATE public.sales 
SET date_of_assignment = created_at::date 
WHERE date_of_assignment IS NULL;

