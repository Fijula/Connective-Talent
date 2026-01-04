-- Create manager entries for existing Google OAuth users
INSERT INTO public.managers (user_id, email, first_name, last_name, domain)
SELECT 
  u.id,
  u.email,
  SPLIT_PART(COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', SPLIT_PART(u.email, '@', 1)), ' ', 1) as first_name,
  CASE 
    WHEN position(' ' in COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')) > 0 THEN 
      TRIM(SUBSTR(COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', ''), position(' ' in COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')) + 1))
    ELSE 
      ''
  END as last_name,
  SPLIT_PART(u.email, '@', 2) as domain
FROM auth.users u
LEFT JOIN public.managers m ON m.user_id = u.id
WHERE m.user_id IS NULL -- Only create for users who don't have manager entries
  AND u.email IS NOT NULL;

-- Create user roles for existing users who don't have them
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'manager'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.user_id IS NULL -- Only create for users who don't have roles
  AND u.email IS NOT NULL;