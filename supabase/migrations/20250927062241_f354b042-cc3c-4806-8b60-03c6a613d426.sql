-- Create managers table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.managers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  first_name text,
  last_name text,
  avatar_url text,
  domain text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on managers if not already enabled
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for managers
DROP POLICY IF EXISTS "Managers can view their own profile" ON public.managers;
DROP POLICY IF EXISTS "Managers can update their own profile" ON public.managers;
DROP POLICY IF EXISTS "Managers can insert their own profile" ON public.managers;

CREATE POLICY "Managers can view their own profile" 
ON public.managers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Managers can update their own profile" 
ON public.managers 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Managers can insert their own profile" 
ON public.managers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Drop and recreate policies for talent_profiles
DROP POLICY IF EXISTS "Managers can manage talent profiles they created" ON public.talent_profiles;
DROP POLICY IF EXISTS "Managers and admins can update talent profiles" ON public.talent_profiles;

CREATE POLICY "Managers can manage talent profiles they created" 
ON public.talent_profiles 
FOR ALL 
USING (manager_id IN (SELECT id FROM public.managers WHERE user_id = auth.uid()));

-- Update talent_skills policy to work with the new structure
DROP POLICY IF EXISTS "Users can manage talent skills for profiles they manage" ON public.talent_skills;

CREATE POLICY "Users can manage talent skills for profiles they manage" 
ON public.talent_skills 
FOR ALL 
USING (EXISTS (
  SELECT 1 
  FROM talent_profiles tp 
  JOIN managers m ON tp.manager_id = m.id 
  WHERE tp.id = talent_skills.talent_profile_id 
  AND m.user_id = auth.uid()
));

-- Update the user creation trigger to create managers instead of profiles
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create manager profile instead of user profile
  INSERT INTO public.managers (user_id, email, first_name, last_name, domain)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    SPLIT_PART(NEW.email, '@', 2)
  );
  
  -- Assign manager role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'manager');
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update the get_user_profile function to work with managers
DROP FUNCTION IF EXISTS public.get_user_profile(uuid);

CREATE OR REPLACE FUNCTION public.get_user_profile(_user_id uuid)
RETURNS TABLE(id uuid, user_id uuid, email text, first_name text, last_name text, avatar_url text, domain text, roles app_role[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.user_id,
    m.email,
    m.first_name,
    m.last_name,
    m.avatar_url,
    m.domain,
    ARRAY_AGG(ur.role) as roles
  FROM public.managers m
  LEFT JOIN public.user_roles ur ON ur.user_id = m.user_id
  WHERE m.user_id = _user_id
  GROUP BY m.id, m.user_id, m.email, m.first_name, m.last_name, m.avatar_url, m.domain;
$$;

-- Add trigger for managers updated_at if not exists
DROP TRIGGER IF EXISTS update_managers_updated_at ON public.managers;
CREATE TRIGGER update_managers_updated_at
BEFORE UPDATE ON public.managers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();