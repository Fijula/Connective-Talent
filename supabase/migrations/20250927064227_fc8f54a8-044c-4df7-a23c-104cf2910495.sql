-- Update the handle_new_user function to properly handle Google OAuth name parsing
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  first_name_val text;
  last_name_val text;
  full_name_val text;
BEGIN
  -- Get the full name from Google OAuth or use email prefix as fallback
  full_name_val := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Extract first and last name from full name or individual fields
  IF NEW.raw_user_meta_data ? 'first_name' THEN
    first_name_val := NEW.raw_user_meta_data ->> 'first_name';
    last_name_val := COALESCE(NEW.raw_user_meta_data ->> 'last_name', '');
  ELSIF NEW.raw_user_meta_data ? 'given_name' THEN
    first_name_val := NEW.raw_user_meta_data ->> 'given_name';
    last_name_val := COALESCE(NEW.raw_user_meta_data ->> 'family_name', '');
  ELSE
    -- Parse full name for Google OAuth (split on first space)
    first_name_val := SPLIT_PART(full_name_val, ' ', 1);
    last_name_val := CASE 
      WHEN position(' ' in full_name_val) > 0 THEN 
        TRIM(SUBSTR(full_name_val, position(' ' in full_name_val) + 1))
      ELSE 
        ''
    END;
  END IF;
  
  -- Create manager profile
  INSERT INTO public.managers (user_id, email, first_name, last_name, domain)
  VALUES (
    NEW.id,
    NEW.email,
    first_name_val,
    last_name_val,
    SPLIT_PART(NEW.email, '@', 2)
  );
  
  -- Assign manager role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'manager');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block the signup
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;