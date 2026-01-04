-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'user');

-- Create talent role enum  
CREATE TYPE public.talent_role AS ENUM ('engineer', 'designer', 'pm', 'qa', 'data_scientist');

-- Create talent status enum
CREATE TYPE public.talent_status AS ENUM ('available', 'assigned', 'bench', 'on_project', 'unavailable');

-- Create opportunity status enum
CREATE TYPE public.opportunity_status AS ENUM ('open', 'filled', 'cancelled', 'on_hold');

-- Create skill category enum
CREATE TYPE public.skill_category AS ENUM ('technical', 'soft', 'domain');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  domain TEXT, -- for domain restriction
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create skills taxonomy table
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category skill_category NOT NULL,
  description TEXT,
  parent_skill_id UUID REFERENCES public.skills(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create talent profiles table
CREATE TABLE public.talent_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talent_role talent_role NOT NULL,
  status talent_status NOT NULL DEFAULT 'available',
  resume_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  portfolio_url TEXT,
  bio TEXT,
  years_experience INTEGER DEFAULT 0,
  hourly_rate DECIMAL(10,2),
  availability_start_date DATE,
  location TEXT,
  timezone TEXT,
  remote_preference BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create talent skills junction table
CREATE TABLE public.talent_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_profile_id UUID NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  years_experience INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(talent_profile_id, skill_id)
);

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  required_role talent_role NOT NULL,
  status opportunity_status NOT NULL DEFAULT 'open',
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  location TEXT,
  remote_allowed BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunity skills junction table
CREATE TABLE public.opportunity_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  required_level INTEGER CHECK (required_level >= 1 AND required_level <= 5),
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, skill_id)
);

-- Create matches table
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  talent_profile_id UUID NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  match_score DECIMAL(5,2) CHECK (match_score >= 0 AND match_score <= 100),
  ai_explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(opportunity_id, talent_profile_id)
);

-- Create match feedback table
CREATE TABLE public.match_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IN (-1, 1)), -- thumbs down or thumbs up
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  talent_profile_id UUID NOT NULL REFERENCES public.talent_profiles(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  start_date DATE,
  end_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity feed table
CREATE TABLE public.activity_feed (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  domain TEXT,
  roles app_role[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.domain,
    ARRAY_AGG(ur.role) as roles
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE p.user_id = _user_id
  GROUP BY p.id, p.user_id, p.email, p.first_name, p.last_name, p.avatar_url, p.domain;
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT USING (true);

-- RLS Policies for skills
CREATE POLICY "Everyone can view skills" ON public.skills
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage skills" ON public.skills
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for talent_profiles
CREATE POLICY "Everyone can view talent profiles" ON public.talent_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own talent profiles" ON public.talent_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins can update talent profiles" ON public.talent_profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for talent_skills
CREATE POLICY "Everyone can view talent skills" ON public.talent_skills
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own talent skills" ON public.talent_skills
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.talent_profiles tp 
      WHERE tp.id = talent_profile_id AND tp.user_id = auth.uid()
    )
  );

-- RLS Policies for opportunities
CREATE POLICY "Everyone can view opportunities" ON public.opportunities
  FOR SELECT USING (true);

CREATE POLICY "Managers and admins can manage opportunities" ON public.opportunities
  FOR ALL USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for opportunity_skills
CREATE POLICY "Everyone can view opportunity skills" ON public.opportunity_skills
  FOR SELECT USING (true);

CREATE POLICY "Managers and admins can manage opportunity skills" ON public.opportunity_skills
  FOR ALL USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for matches
CREATE POLICY "Everyone can view matches" ON public.matches
  FOR SELECT USING (true);

CREATE POLICY "System can create matches" ON public.matches
  FOR INSERT WITH CHECK (true);

-- RLS Policies for match_feedback
CREATE POLICY "Users can view all feedback" ON public.match_feedback
  FOR SELECT USING (true);

CREATE POLICY "Users can create feedback" ON public.match_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for assignments
CREATE POLICY "Everyone can view assignments" ON public.assignments
  FOR SELECT USING (true);

CREATE POLICY "Managers and admins can manage assignments" ON public.assignments
  FOR ALL USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for activity_feed
CREATE POLICY "Users can view activity feed" ON public.activity_feed
  FOR SELECT USING (true);

CREATE POLICY "System can create activity" ON public.activity_feed
  FOR INSERT WITH CHECK (true);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, first_name, last_name, domain)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    SPLIT_PART(NEW.email, '@', 2)
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_talent_profiles_updated_at
  BEFORE UPDATE ON public.talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial skills data
INSERT INTO public.skills (name, category, description) VALUES
-- Technical Skills
('React', 'technical', 'JavaScript library for building user interfaces'),
('TypeScript', 'technical', 'Typed superset of JavaScript'),
('Node.js', 'technical', 'JavaScript runtime built on Chrome V8 engine'),
('Python', 'technical', 'High-level programming language'),
('Java', 'technical', 'Object-oriented programming language'),
('AWS', 'technical', 'Amazon Web Services cloud platform'),
('Docker', 'technical', 'Containerization platform'),
('Kubernetes', 'technical', 'Container orchestration platform'),
('PostgreSQL', 'technical', 'Open source relational database'),
('MongoDB', 'technical', 'NoSQL document database'),
('GraphQL', 'technical', 'Query language for APIs'),
('REST API', 'technical', 'Representational State Transfer API design'),
('Machine Learning', 'technical', 'AI algorithms and statistical models'),
('Data Analysis', 'technical', 'Process of inspecting and modeling data'),
('Figma', 'technical', 'Collaborative interface design tool'),
('Adobe Creative Suite', 'technical', 'Collection of creative software'),
('Sketch', 'technical', 'Digital design toolkit'),
('Prototyping', 'technical', 'Creating preliminary models of products'),

-- Soft Skills
('Leadership', 'soft', 'Ability to guide and influence others'),
('Communication', 'soft', 'Effective verbal and written expression'),
('Problem Solving', 'soft', 'Analytical and creative thinking'),
('Teamwork', 'soft', 'Collaborative working with others'),
('Adaptability', 'soft', 'Flexibility in changing environments'),
('Time Management', 'soft', 'Organizing and planning time effectively'),
('Critical Thinking', 'soft', 'Objective analysis and evaluation'),
('Creativity', 'soft', 'Original and innovative thinking'),
('Emotional Intelligence', 'soft', 'Understanding and managing emotions'),
('Mentoring', 'soft', 'Guiding and developing others'),

-- Domain Skills
('Financial Services', 'domain', 'Banking and financial industry knowledge'),
('Healthcare', 'domain', 'Medical and healthcare industry expertise'),
('E-commerce', 'domain', 'Online retail and marketplace experience'),
('SaaS', 'domain', 'Software as a Service business model'),
('Mobile Applications', 'domain', 'Mobile app development and design'),
('Web Applications', 'domain', 'Web-based software development'),
('Enterprise Software', 'domain', 'Large-scale business software'),
('Startup Environment', 'domain', 'Fast-paced startup experience'),
('Agile/Scrum', 'domain', 'Agile development methodologies'),
('DevOps', 'domain', 'Development and operations integration');