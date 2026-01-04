-- Remove duplicate talent profiles (keep the oldest one)
WITH duplicate_emails AS (
  SELECT 
    p.email,
    tp.id as talent_id,
    tp.created_at,
    ROW_NUMBER() OVER (PARTITION BY p.email ORDER BY tp.created_at ASC) as rn
  FROM public.talent_profiles tp
  JOIN public.profiles p ON tp.user_id = p.user_id
)
DELETE FROM public.talent_profiles 
WHERE id IN (
  SELECT talent_id 
  FROM duplicate_emails 
  WHERE rn > 1
);

-- Now add email and avatar_url columns
ALTER TABLE public.talent_profiles 
ADD COLUMN email TEXT,
ADD COLUMN avatar_url TEXT;

-- Copy email from profiles table
UPDATE public.talent_profiles 
SET email = profiles.email
FROM public.profiles 
WHERE talent_profiles.user_id = profiles.user_id;

-- Make email NOT NULL and add unique constraint
ALTER TABLE public.talent_profiles 
ALTER COLUMN email SET NOT NULL,
ADD CONSTRAINT talent_profiles_email_unique UNIQUE (email);

-- Create index for better performance
CREATE INDEX idx_talent_profiles_email ON public.talent_profiles(email);