import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, MapPin, Calendar, Briefcase, GraduationCap, Award, BookOpen, Play, TrendingUp, Edit, Save, X, ArrowLeft, Upload, Camera, Plus, UserPlus, Users, Target, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { aiService } from '@/services/aiService';

interface UserProfile {
  id: string;
  user_id: string | null;
  email: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  bio: string;
  location: string;
  education: string;
  work_experience: string;
  certifications: string;
  skills: string[];
  avatar_url?: string;
  domain?: string | null;
}

interface CareerTip {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  relevance_score?: number;
}

interface Course {
  id: string;
  title: string;
  provider: string;
  url: string;
  thumbnail: string;
  duration: string;
  rating: number;
  skills?: string[];
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  relevance_score?: number;
  is_upskill?: boolean; // True if course is outside current skill set
}

interface ReferredTalent {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  talent_role: string;
  years_experience: number;
  skills: string[];
  location: string;
  bio?: string;
  talent_type: string;
  prospect_status?: string;
  referred_by?: string;
  referred_for_opportunity?: string;
  created_at: string;
  avatar_url?: string;
  [key: string]: any; // Allow additional properties
}

export default function UserDashboard() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [careerTips, setCareerTips] = useState<CareerTip[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [referredTalents, setReferredTalents] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { user } = useAuth();
  const { isAdmin, isManager } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.email) {
      fetchUserProfile();
    }
  }, [user?.email]);

  // Fetch career tips and courses when profile is loaded
  useEffect(() => {
    if (profile) {
      fetchCareerTips();
      fetchCourses();
      fetchOpportunities();
      fetchUsers();
    }
  }, [profile]);

  // Fetch referrals when user is available
  useEffect(() => {
    if (user?.id) {
      console.log('Current user ID:', user.id);
      console.log('Current user object:', user);
      fetchReferredTalents();
    }
  }, [user?.id]);

  // Handle tab parameter from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'career', 'learning', 'referrals'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('email', user?.email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile({
          id: data.id,
          user_id: null, // talent_profiles doesn't have user_id field
          email: data.email,
          name: data.first_name && data.last_name ? `${data.first_name} ${data.last_name}` : data.first_name || data.last_name || '',
          first_name: data.first_name,
          last_name: data.last_name,
          bio: data.bio || '',
          location: data.location || '',
          education: data.education || '',
          work_experience: data.work_experience || '',
          certifications: data.certifications || '',
          skills: data.skills || [],
          avatar_url: data.avatar_url,
          domain: null // talent_profiles doesn't have domain field
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCareerTips = async () => {
    try {
      if (!profile) {
        console.log('No profile available for career tips');
        return;
      }
      
      console.log('Fetching career tips for profile:', profile);
      
      // Prepare user profile for AI service
      const userProfile = {
        skills: profile.skills || [],
        workExperience: profile.work_experience || '',
        education: profile.education || '',
        name: profile.name,
        email: profile.email
      };
      
      console.log('User profile for AI:', userProfile);
      
      // Call real AI service
      const aiTips = await aiService.getCareerTips(userProfile);
      console.log('AI career tips received:', aiTips);
      setCareerTips(aiTips);
    } catch (error) {
      console.error('Error fetching career tips:', error);
      // Fallback to basic tips
      const fallbackTips = getFallbackTips();
      console.log('Using fallback tips:', fallbackTips);
      setCareerTips(fallbackTips);
    }
  };

  const fetchAICareerTips = async (skills: string[], experience: string, education: string): Promise<CareerTip[]> => {
    try {
      // Create AI prompt for career tips
      const prompt = `Based on the following user profile, provide 5 personalized career growth tips:

User Skills: ${skills.join(', ')}
Work Experience: ${experience}
Education: ${education}

Please provide tips that:
1. Build on their current skills and experience
2. Address gaps in their skill set
3. Are relevant to their career level
4. Include both technical and soft skills
5. Are actionable and specific
6. Consider current industry trends

For each tip, provide:
- Title
- Description
- Category (Technical Skills, Soft Skills, Leadership, Career Development, etc.)
- Difficulty level (Beginner/Intermediate/Advanced)
- Relevance score (1-10)

Format as JSON array with these fields: id, title, description, category, difficulty, relevance_score`;

      // For now, we'll use a mock AI response
      // In production, this would call OpenAI, Claude, or another AI service
      const aiResponse = await callAITipsService(prompt);
      return aiResponse;
    } catch (error) {
      console.error('AI service error:', error);
      // Fallback to intelligent local recommendations
      return generateIntelligentTips(skills, experience, education);
    }
  };

  const callAITipsService = async (prompt: string): Promise<CareerTip[]> => {
    // Mock AI service call - replace with real AI API
    // This simulates what would happen with OpenAI, Claude, or Gemini
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock AI response based on user profile
    const userSkills = profile?.skills || [];
    const hasReact = userSkills.some(skill => skill.toLowerCase().includes('react'));
    const hasNode = userSkills.some(skill => skill.toLowerCase().includes('node'));
    const hasPython = userSkills.some(skill => skill.toLowerCase().includes('python'));
    const hasAWS = userSkills.some(skill => skill.toLowerCase().includes('aws'));
    const isJunior = profile?.work_experience?.toLowerCase().includes('junior') || userSkills.length < 3;
    const isSenior = profile?.work_experience?.toLowerCase().includes('senior') || userSkills.length > 8;
    
    const aiTips: CareerTip[] = [];
    
    // AI would analyze the prompt and return personalized career advice
    // For demo purposes, we'll return intelligent mock data
    
    if (hasReact && !userSkills.some(skill => skill.toLowerCase().includes('typescript'))) {
      aiTips.push({
        id: 'ai-tip-1',
        title: 'Master TypeScript for Better React Development',
        description: 'Learn TypeScript to write more maintainable and scalable React applications. This will make you a more valuable developer and open doors to senior positions.',
        category: 'Technical Skills',
        difficulty: 'Intermediate',
        relevance_score: 9
      });
    }
    
    if (isJunior) {
      aiTips.push({
        id: 'ai-tip-2',
        title: 'Build a Strong Portfolio with Real Projects',
        description: 'Create 3-5 impressive projects that showcase your skills. Deploy them online and document your development process. This is crucial for landing your first job.',
        category: 'Career Development',
        difficulty: 'Beginner',
        relevance_score: 10
      });
    }
    
    if (isSenior && !userSkills.some(skill => skill.toLowerCase().includes('ai'))) {
      aiTips.push({
        id: 'ai-tip-3',
        title: 'Embrace AI and Machine Learning',
        description: 'As a senior developer, learning AI/ML will future-proof your career. Start with Python and basic machine learning concepts to stay relevant in the evolving tech landscape.',
        category: 'Emerging Technologies',
        difficulty: 'Advanced',
        relevance_score: 8
      });
    }
    
    if (!hasAWS && (hasNode || hasPython)) {
      aiTips.push({
        id: 'ai-tip-4',
        title: 'Learn Cloud Architecture and DevOps',
        description: 'Master AWS, Docker, and CI/CD pipelines. These skills are in high demand and will significantly increase your market value and career opportunities.',
        category: 'Technical Skills',
        difficulty: 'Intermediate',
        relevance_score: 8
      });
    }
    
    // Always include soft skills tip
    aiTips.push({
      id: 'ai-tip-5',
      title: 'Develop Leadership and Communication Skills',
      description: 'Focus on improving your ability to explain technical concepts, mentor junior developers, and lead technical discussions. These skills are essential for career advancement.',
      category: 'Soft Skills',
      difficulty: 'Beginner',
      relevance_score: 7
    });
    
    return aiTips.slice(0, 5);
  };

  const generateIntelligentTips = (skills: string[], experience: string, education: string): CareerTip[] => {
    const tips: CareerTip[] = [];
    
    // Analyze user's current skills
    const hasReact = skills.some(skill => skill.toLowerCase().includes('react'));
    const hasNode = skills.some(skill => skill.toLowerCase().includes('node') || skill.toLowerCase().includes('javascript'));
    const hasPython = skills.some(skill => skill.toLowerCase().includes('python'));
    const hasAWS = skills.some(skill => skill.toLowerCase().includes('aws') || skill.toLowerCase().includes('cloud'));
    const hasDatabase = skills.some(skill => skill.toLowerCase().includes('sql') || skill.toLowerCase().includes('database'));
    const hasAI = skills.some(skill => skill.toLowerCase().includes('ai') || skill.toLowerCase().includes('ml') || skill.toLowerCase().includes('machine learning'));
    
    // Determine experience level
    const isJunior = experience.toLowerCase().includes('junior') || experience.toLowerCase().includes('entry') || 
                    skills.length < 3;
    const isSenior = experience.toLowerCase().includes('senior') || experience.toLowerCase().includes('lead') ||
                    skills.length > 8;
    
    // Generate personalized tips based on skills and experience
    if (hasReact && !hasNode) {
      tips.push({
        id: '1',
        title: 'Master Full-Stack Development',
        description: 'Expand your React skills by learning Node.js and Express to become a full-stack developer.',
        category: 'Technical Skills',
        difficulty: isJunior ? 'Intermediate' : 'Advanced',
        relevance_score: 9
      });
    }
    
    if (hasNode && !hasDatabase) {
      tips.push({
        id: '2',
        title: 'Learn Database Design',
        description: 'Master SQL and database design patterns to build robust backend systems.',
        category: 'Technical Skills',
        difficulty: 'Intermediate',
        relevance_score: 8
      });
    }
    
    if (!hasAWS && (hasNode || hasPython)) {
      tips.push({
        id: '3',
        title: 'Cloud Architecture & DevOps',
        description: 'Learn AWS, Docker, and CI/CD to deploy and scale your applications professionally.',
        category: 'Technical Skills',
        difficulty: isSenior ? 'Advanced' : 'Intermediate',
        relevance_score: 7
      });
    }
    
    if (isJunior) {
      tips.push({
        id: '4',
        title: 'Build Your Portfolio',
        description: 'Create 3-5 impressive projects showcasing your skills and deploy them online.',
        category: 'Career Development',
        difficulty: 'Beginner',
        relevance_score: 9
      });
    }
    
    if (isSenior) {
      tips.push({
        id: '5',
        title: 'Technical Leadership',
        description: 'Develop mentoring skills and learn system design to advance to tech lead roles.',
        category: 'Leadership',
        difficulty: 'Advanced',
        relevance_score: 8
      });
    }
    
    // Add soft skills tips
    tips.push({
      id: '6',
      title: 'Communication & Collaboration',
      description: 'Improve your ability to explain technical concepts and work effectively in teams.',
      category: 'Soft Skills',
      difficulty: 'Beginner',
      relevance_score: 6
    });
    
    // Add upskilling recommendations
    if (!hasPython && !hasAI) {
      tips.push({
        id: '7',
        title: 'Explore AI & Machine Learning',
        description: 'Learn Python and machine learning fundamentals to stay ahead in the tech industry.',
        category: 'Emerging Technologies',
        difficulty: 'Intermediate',
        relevance_score: 7
      });
    }
    
    return tips.slice(0, 5); // Return top 5 most relevant tips
  };

  const getFallbackTips = (): CareerTip[] => [
    {
      id: '1',
      title: 'Continuous Learning',
      description: 'Stay updated with the latest technologies and best practices in your field.',
      category: 'Career Development',
      difficulty: 'Beginner',
      relevance_score: 5
    },
    {
      id: '2',
      title: 'Build Your Network',
      description: 'Connect with other professionals in your industry through meetups and online communities.',
      category: 'Career Development',
      difficulty: 'Beginner',
      relevance_score: 5
    }
  ];

  const fetchReferredTalents = async () => {
    try {
      if (!user?.id) {
        console.log('No user ID available for fetching referrals');
        return;
      }
      
      console.log('Current user.id (user_id from users table):', user.id);
      console.log('User data:', user);
      
      // First, get the actual user ID from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, user_id, email, first_name, last_name')
        .eq('user_id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        return;
      }
      
      console.log('User data from users table:', userData);
      console.log('Actual user ID to use for referrals:', userData.id);
      
      // Now fetch referrals using the correct user ID
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('*')
        .eq('referred_by', userData.id);
      
      console.log('Query result:', { data, error });

      if (error) {
        console.error('Error fetching referred talents:', error);
        throw error;
      }
      
      console.log('Found referrals:', data);
      setReferredTalents(data || []);
    } catch (error) {
      console.error('Error fetching referred talents:', error);
    }
  };

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleReferFriend = async () => {
    // First get the correct user ID from the users table
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user ID:', userError);
        return;
      }
      
      // Navigate to add talent page with referral parameters
      const params = new URLSearchParams({
        source: 'employee_referral',
        referred_by: userData.id,
        referral_mode: 'true'
      });
      navigate(`/add-talent?${params.toString()}`);
    } catch (error) {
      console.error('Error in handleReferFriend:', error);
    }
  };

  const handleReferForOpportunity = async (opportunityId: string) => {
    // First get the correct user ID from the users table
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user?.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user ID:', userError);
        return;
      }
      
      // Navigate to add talent page with specific opportunity
      const params = new URLSearchParams({
        source: 'employee_referral',
        referred_by: userData.id,
        referred_for_opportunity: opportunityId,
        referral_mode: 'true'
      });
      navigate(`/add-talent?${params.toString()}`);
    } catch (error) {
      console.error('Error in handleReferForOpportunity:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchCourses = async () => {
    try {
      if (!profile) {
        console.log('No profile available for courses');
        return;
      }
      
      console.log('Fetching courses for profile:', profile);
      
      // Prepare user profile for AI service
      const userProfile = {
        skills: profile.skills || [],
        workExperience: profile.work_experience || '',
        education: profile.education || '',
        name: profile.name,
        email: profile.email
      };
      
      console.log('User profile for AI courses:', userProfile);
      
      // Call real AI service
      const aiCourses = await aiService.getCourseRecommendations(userProfile);
      console.log('AI courses received:', aiCourses);
      console.log('AI courses type:', typeof aiCourses);
      console.log('AI courses length:', aiCourses?.length);
      
      // Convert AICourse[] to Course[] format
      const convertedCourses: Course[] = aiCourses.map(course => ({
        id: course.id,
        title: course.title,
        provider: course.provider,
        url: course.url,
        thumbnail: course.thumbnail,
        duration: course.duration,
        rating: course.rating,
        skills: course.skills || [],
        difficulty: course.difficulty,
        relevance_score: course.relevance_score
      }));
      
      console.log('Converted courses:', convertedCourses);
      console.log('Setting courses state with converted AI data...');
      setCourses(convertedCourses);
      console.log('Courses state set with converted AI data');
    } catch (error) {
      console.error('Error fetching courses:', error);
      console.error('Error details:', error);
      // Fallback to basic courses
      const fallbackCourses = getFallbackCourses();
      console.log('Using fallback courses:', fallbackCourses);
      console.log('Setting fallback courses state...');
      setCourses(fallbackCourses);
      console.log('Fallback courses state set');
    }
  };

  const fetchAICourseRecommendations = async (skills: string[], experience: string, education: string): Promise<Course[]> => {
    try {
      // Create AI prompt for course recommendations
      const prompt = `Based on the following user profile, recommend 6 relevant online courses:

User Skills: ${skills.join(', ')}
Work Experience: ${experience}
Education: ${education}

Please recommend courses that:
1. Build on their current skills (skill-building courses)
2. Introduce new technologies they don't know (upskilling courses)
3. Are appropriate for their experience level
4. Include both free and paid options
5. Cover emerging technologies like AI/ML, cloud computing, etc.

For each course, provide:
- Title
- Provider (YouTube, Udemy, Coursera, etc.)
- URL
- Duration
- Rating (1-5)
- Skills covered
- Difficulty level (Beginner/Intermediate/Advanced)
- Relevance score (1-10)
- Whether it's upskilling (true/false)

Format as JSON array with these fields: id, title, provider, url, thumbnail, duration, rating, skills, difficulty, relevance_score, is_upskill`;

      // For now, we'll use a mock AI response
      // In production, this would call OpenAI, Claude, or another AI service
      const aiResponse = await callAIService(prompt);
      return aiResponse;
    } catch (error) {
      console.error('AI service error:', error);
      // Fallback to intelligent local recommendations
      return generateIntelligentCourses(skills, experience);
    }
  };

  const callAIService = async (prompt: string): Promise<Course[]> => {
    // Mock AI service call - replace with real AI API
    // This simulates what would happen with OpenAI, Claude, or Gemini
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock AI response based on user profile
    const userSkills = profile?.skills || [];
    const hasReact = userSkills.some(skill => skill.toLowerCase().includes('react'));
    const hasNode = userSkills.some(skill => skill.toLowerCase().includes('node'));
    const hasPython = userSkills.some(skill => skill.toLowerCase().includes('python'));
    const hasAWS = userSkills.some(skill => skill.toLowerCase().includes('aws'));
    const isJunior = profile?.work_experience?.toLowerCase().includes('junior') || userSkills.length < 3;
    
    const aiCourses: Course[] = [];
    
    // AI would analyze the prompt and return personalized recommendations
    // For demo purposes, we'll return intelligent mock data
    
    if (hasReact && !userSkills.some(skill => skill.toLowerCase().includes('typescript'))) {
      aiCourses.push({
        id: 'ai-1',
        title: 'Advanced TypeScript for React Developers',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/typescript-for-react-developers/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '20 hours',
        rating: 4.8,
        skills: ['TypeScript', 'React', 'JavaScript'],
        difficulty: 'Intermediate',
        relevance_score: 9,
        is_upskill: false
      });
    }
    
    if (!hasPython && !hasAWS) {
      aiCourses.push({
        id: 'ai-2',
        title: 'Python for Data Science and Machine Learning',
        provider: 'Coursera',
        url: 'https://www.coursera.org/learn/python-for-applied-data-science-ai',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/387066_cc92_3.jpg',
        duration: '25 hours',
        rating: 4.6,
        skills: ['Python', 'Data Science', 'Machine Learning'],
        difficulty: 'Intermediate',
        relevance_score: 8,
        is_upskill: true
      });
    }
    
    if (hasNode && !userSkills.some(skill => skill.toLowerCase().includes('docker'))) {
      aiCourses.push({
        id: 'ai-3',
        title: 'Docker and Kubernetes for Developers',
        provider: 'YouTube',
        url: 'https://www.youtube.com/watch?v=3hLmDS179YE',
        thumbnail: 'https://img.youtube.com/vi/3hLmDS179YE/maxresdefault.jpg',
        duration: '15 hours',
        rating: 4.7,
        skills: ['Docker', 'Kubernetes', 'DevOps'],
        difficulty: 'Intermediate',
        relevance_score: 7,
        is_upskill: true
      });
    }
    
    if (isJunior) {
      aiCourses.push({
        id: 'ai-4',
        title: 'Complete Web Development Bootcamp 2024',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/the-complete-web-developer-bootcamp/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '50 hours',
        rating: 4.7,
        skills: ['HTML', 'CSS', 'JavaScript', 'React'],
        difficulty: 'Beginner',
        relevance_score: 9,
        is_upskill: true
      });
    }
    
    if (!hasAWS) {
      aiCourses.push({
        id: 'ai-5',
        title: 'AWS Certified Solutions Architect',
        provider: 'A Cloud Guru',
        url: 'https://acloudguru.com/course/aws-certified-solutions-architect-associate-saa-c02',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/8324_fa64_6.jpg',
        duration: '30 hours',
        rating: 4.8,
        skills: ['AWS', 'Cloud Architecture', 'DevOps'],
        difficulty: 'Advanced',
        relevance_score: 8,
        is_upskill: true
      });
    }
    
    // Add AI/ML course if not already covered
    if (!userSkills.some(skill => skill.toLowerCase().includes('ai') || skill.toLowerCase().includes('ml'))) {
      aiCourses.push({
        id: 'ai-6',
        title: 'Machine Learning Specialization',
        provider: 'Coursera',
        url: 'https://www.coursera.org/specializations/machine-learning-introduction',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/387066_cc92_3.jpg',
        duration: '40 hours',
        rating: 4.9,
        skills: ['Machine Learning', 'Python', 'AI', 'Statistics'],
        difficulty: 'Advanced',
        relevance_score: 7,
        is_upskill: true
      });
    }
    
    return aiCourses.slice(0, 10);
  };

  const generateIntelligentCourses = (skills: string[], experience: string): Course[] => {
    const courses: Course[] = [];
    
    // Analyze user's current skills
    const hasReact = skills.some(skill => skill.toLowerCase().includes('react'));
    const hasNode = skills.some(skill => skill.toLowerCase().includes('node') || skill.toLowerCase().includes('javascript'));
    const hasPython = skills.some(skill => skill.toLowerCase().includes('python'));
    const hasAWS = skills.some(skill => skill.toLowerCase().includes('aws') || skill.toLowerCase().includes('cloud'));
    const hasDatabase = skills.some(skill => skill.toLowerCase().includes('sql') || skill.toLowerCase().includes('database'));
    const hasAI = skills.some(skill => skill.toLowerCase().includes('ai') || skill.toLowerCase().includes('ml'));
    const hasTypeScript = skills.some(skill => skill.toLowerCase().includes('typescript'));
    
    // Determine experience level
    const isJunior = experience.toLowerCase().includes('junior') || experience.toLowerCase().includes('entry') || 
                    skills.length < 3;
    const isSenior = experience.toLowerCase().includes('senior') || experience.toLowerCase().includes('lead') ||
                    skills.length > 8;
    
    // Skill-building courses (within current skill set)
    if (hasReact && !hasTypeScript) {
      courses.push({
        id: '1',
        title: 'TypeScript for React Developers',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/typescript-for-react-developers/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '20 hours',
        rating: 4.8,
        skills: ['TypeScript', 'React', 'JavaScript'],
        difficulty: 'Intermediate',
        relevance_score: 9,
        is_upskill: false
      });
    }
    
    if (hasNode && !hasDatabase) {
      courses.push({
        id: '2',
        title: 'SQL and Database Design',
        provider: 'YouTube',
        url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
        thumbnail: 'https://img.youtube.com/vi/HXV3zeQKqGY/maxresdefault.jpg',
        duration: '15 hours',
        rating: 4.7,
        skills: ['SQL', 'Database Design', 'PostgreSQL'],
        difficulty: 'Intermediate',
        relevance_score: 8,
        is_upskill: false
      });
    }
    
    if (hasReact && !hasNode) {
      courses.push({
        id: '3',
        title: 'Node.js and Express Masterclass',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/nodejs-the-complete-guide/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/8324_fa64_6.jpg',
        duration: '35 hours',
        rating: 4.7,
        skills: ['Node.js', 'Express', 'Backend Development'],
        difficulty: 'Intermediate',
        relevance_score: 9,
        is_upskill: false
      });
    }
    
    // Upskilling courses (outside current skill set)
    if (!hasPython && !hasAI) {
      courses.push({
        id: '4',
        title: 'Python for Data Science and AI',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/387066_cc92_3.jpg',
        duration: '25 hours',
        rating: 4.6,
        skills: ['Python', 'Data Science', 'Machine Learning'],
        difficulty: 'Intermediate',
        relevance_score: 8,
        is_upskill: true
      });
    }
    
    if (!hasAWS && (hasNode || hasPython)) {
      courses.push({
        id: '5',
        title: 'AWS Cloud Practitioner Certification',
        provider: 'YouTube',
        url: 'https://www.youtube.com/watch?v=3hLmDS179YE',
        thumbnail: 'https://img.youtube.com/vi/3hLmDS179YE/maxresdefault.jpg',
        duration: '18 hours',
        rating: 4.7,
        skills: ['AWS', 'Cloud Computing', 'DevOps'],
        difficulty: isSenior ? 'Advanced' : 'Intermediate',
        relevance_score: 7,
        is_upskill: true
      });
    }
    
    if (isJunior && !hasReact) {
      courses.push({
        id: '6',
        title: 'Complete React Developer Course',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '40 hours',
        rating: 4.8,
        skills: ['React', 'JavaScript', 'Frontend Development'],
        difficulty: 'Beginner',
        relevance_score: 9,
        is_upskill: true
      });
    }
    
    if (isSenior && !hasAI) {
      courses.push({
        id: '7',
        title: 'System Design for Tech Interviews',
        provider: 'YouTube',
        url: 'https://www.youtube.com/watch?v=ZgdS0EUmn70',
        thumbnail: 'https://img.youtube.com/vi/ZgdS0EUmn70/maxresdefault.jpg',
        duration: '12 hours',
        rating: 4.9,
        skills: ['System Design', 'Architecture', 'Scalability'],
        difficulty: 'Advanced',
        relevance_score: 8,
        is_upskill: false
      });
    }
    
    // Add emerging technology courses
    if (!hasAI) {
      courses.push({
        id: '8',
        title: 'Machine Learning with Python',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/machinelearning/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/387066_cc92_3.jpg',
        duration: '30 hours',
        rating: 4.5,
        skills: ['Machine Learning', 'Python', 'AI'],
        difficulty: 'Advanced',
        relevance_score: 6,
        is_upskill: true
      });
    }
    
    return courses.slice(0, 10); // Return top 10 most relevant courses
  };

  const getFallbackCourses = (): Course[] => [
    {
      id: '1',
      title: 'JavaScript Fundamentals',
      provider: 'YouTube',
      url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
      thumbnail: 'https://img.youtube.com/vi/PkZNo7MFNFg/maxresdefault.jpg',
      duration: '15 hours',
      rating: 4.6,
      skills: ['JavaScript', 'Programming'],
      difficulty: 'Beginner',
      relevance_score: 5,
      is_upskill: false
    },
    {
      id: '2',
      title: 'Web Development Bootcamp',
      provider: 'Udemy',
      url: 'https://www.udemy.com/course/the-complete-web-developer-bootcamp/',
      thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
      duration: '50 hours',
      rating: 4.7,
      skills: ['HTML', 'CSS', 'JavaScript'],
      difficulty: 'Beginner',
      relevance_score: 5,
      is_upskill: false
    },
    {
      id: '3',
      title: 'React - The Complete Guide',
      provider: 'Udemy',
      url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/',
      thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
      duration: '40 hours',
      rating: 4.7,
      skills: ['React', 'JavaScript', 'Redux'],
      difficulty: 'Intermediate',
      relevance_score: 8,
      is_upskill: true
    },
    {
      id: '4',
      title: 'Node.js Complete Guide',
      provider: 'Udemy',
      url: 'https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/',
      thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
      duration: '63 hours',
      rating: 4.8,
      skills: ['Node.js', 'Express', 'MongoDB'],
      difficulty: 'Intermediate',
      relevance_score: 7,
      is_upskill: true
    },
    {
      id: '5',
      title: 'Python for Data Science',
      provider: 'Udemy',
      url: 'https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/',
      thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
      duration: '25 hours',
      rating: 4.6,
      skills: ['Python', 'Data Science', 'Machine Learning'],
      difficulty: 'Intermediate',
      relevance_score: 6,
      is_upskill: true
    },
    {
      id: '6',
      title: 'AWS Cloud Practitioner',
      provider: 'Udemy',
      url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate/',
      thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
      duration: '30 hours',
      rating: 4.5,
      skills: ['AWS', 'Cloud Computing', 'DevOps'],
      difficulty: 'Advanced',
      relevance_score: 7,
      is_upskill: true
    },
    {
      id: '7',
      title: 'Docker and Kubernetes',
      provider: 'Udemy',
      url: 'https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/',
      thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
      duration: '20 hours',
      rating: 4.7,
      skills: ['Docker', 'Kubernetes', 'DevOps'],
      difficulty: 'Intermediate',
      relevance_score: 6,
      is_upskill: true
    },
    {
      id: '8',
      title: 'SQL Database Bootcamp',
      provider: 'Udemy',
      url: 'https://www.udemy.com/course/complete-sql-database-bootcamp-zero-to-mastery/',
      thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
      duration: '35 hours',
      rating: 4.6,
      skills: ['SQL', 'Database', 'PostgreSQL'],
      difficulty: 'Beginner',
      relevance_score: 5,
      is_upskill: false
    },
    {
      id: '9',
      title: 'Git and GitHub Tutorial',
      provider: 'YouTube',
      url: 'https://www.youtube.com/watch?v=RGOj5yH7evk',
      thumbnail: 'https://img.youtube.com/vi/RGOj5yH7evk/maxresdefault.jpg',
      duration: '8 hours',
      rating: 4.8,
      skills: ['Git', 'GitHub', 'Version Control'],
      difficulty: 'Beginner',
      relevance_score: 9,
      is_upskill: false
    },
    {
      id: '10',
      title: 'System Design Interview',
      provider: 'YouTube',
      url: 'https://www.youtube.com/watch?v=ZgdS0OUmnzs',
      thumbnail: 'https://img.youtube.com/vi/ZgdS0OUmnzs/maxresdefault.jpg',
      duration: '12 hours',
      rating: 4.9,
      skills: ['System Design', 'Architecture', 'Scalability'],
      difficulty: 'Advanced',
      relevance_score: 8,
      is_upskill: true
    }
  ];

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('talent_profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          bio: profile.bio,
          location: profile.location,
          education: profile.education,
          work_experience: profile.work_experience,
          certifications: profile.certifications,
          skills: profile.skills,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditing(false);
    fetchUserProfile(); // Reset to original data
  };

  const handleProfilePictureUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadProfilePicture(file);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      await uploadProfilePicture(files[0]);
    }
  };

  const uploadProfilePicture = async (file: File) => {
    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      setPreviewUrl(null);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      setPreviewUrl(null);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update talent profile with new avatar URL
      const { error: updateError } = await supabase
        .from('talent_profiles')
        .update({ 
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile?.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);

      // Clean up preview
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }

      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      toast({
        title: "Error",
        description: "Failed to update profile picture",
        variant: "destructive",
      });
      
      // Clean up preview on error
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    
    setProfile(prev => prev ? {
      ...prev,
      skills: [...(prev.skills || []), newSkill.trim()]
    } : null);
    
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile(prev => prev ? {
      ...prev,
      skills: prev.skills?.filter(skill => skill !== skillToRemove) || []
    } : null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {(isAdmin || isManager) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/')}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Dashboard</span>
                </Button>
              )}
              <User className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                <p className="text-gray-600">Manage your profile and career growth</p>
              </div>
            </div>
            <div className="flex space-x-2">
              {editing ? (
                <>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setEditing(true)} className="bg-primary hover:bg-primary/90">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="career">Career Growth</TabsTrigger>
            <TabsTrigger value="courses">Learning</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your basic profile information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div 
                        className="relative group"
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      >
                        <Avatar className="h-24 w-24 border-4 border-gray-200">
                          <AvatarImage src={previewUrl || profile?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                            {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        {/* Upload overlay - always visible when editing */}
                        {editing && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center cursor-pointer group-hover:bg-opacity-70 transition-all duration-200">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleProfilePictureUpload}
                              className="hidden"
                              id="profile-picture-upload"
                              disabled={uploading}
                            />
                            <label
                              htmlFor="profile-picture-upload"
                              className="flex flex-col items-center justify-center text-white cursor-pointer w-full h-full"
                            >
                              {uploading ? (
                                <div className="flex flex-col items-center w-full px-4">
                                  <div className="w-full bg-white/20 rounded-full h-2 mb-2">
                                    <div 
                                      className="bg-white h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${uploadProgress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium">{uploadProgress}%</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <Camera className="h-6 w-6 mb-1" />
                                  <span className="text-xs font-medium">Click or Drag</span>
                                  <span className="text-xs opacity-75">to upload</span>
                                </div>
                              )}
                            </label>
                          </div>
                        )}
                        
                        {/* Hover hint when not editing */}
                        {!editing && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full transition-all duration-200 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center text-white">
                              <Camera className="h-5 w-5 mb-1" />
                              <span className="text-xs font-medium">Click Edit to Upload</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">
                          {profile?.name || `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'No Name'}
                        </h3>
                        <p className="text-gray-600">{profile?.email}</p>
                        {editing && (
                          <p className="text-sm text-gray-500 mt-1">
                            Click the camera icon to update your profile picture
                          </p>
                        )}
                        {!editing && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <p className="text-sm text-blue-700">
                              💡 <strong>Tip:</strong> Click "Edit Profile" to upload a profile picture and manage your skills
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <Input
                          value={profile?.name || ''}
                          onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                          disabled={!editing}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Location</label>
                        <Input
                          value={profile?.location || ''}
                          onChange={(e) => setProfile(prev => prev ? { ...prev, location: e.target.value } : null)}
                          disabled={!editing}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Bio</label>
                      <Textarea
                        value={profile?.bio || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, bio: e.target.value } : null)}
                        disabled={!editing}
                        className="mt-1"
                        rows={3}
                        placeholder="Tell us about yourself..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Education</label>
                      <Textarea
                        value={profile?.education || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, education: e.target.value } : null)}
                        disabled={!editing}
                        className="mt-1"
                        rows={2}
                        placeholder="Your educational background..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Work Experience</label>
                      <Textarea
                        value={profile?.work_experience || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, work_experience: e.target.value } : null)}
                        disabled={!editing}
                        className="mt-1"
                        rows={3}
                        placeholder="Your work experience..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Certifications</label>
                      <Textarea
                        value={profile?.certifications || ''}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, certifications: e.target.value } : null)}
                        disabled={!editing}
                        className="mt-1"
                        rows={2}
                        placeholder="Your certifications and achievements..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Skills Card */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Skills</CardTitle>
                    <CardDescription>Your technical skills and expertise</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {profile?.skills?.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {skill}
                          {editing && (
                            <button
                              onClick={() => handleRemoveSkill(skill)}
                              className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      ))}
                      {(!profile?.skills || profile.skills.length === 0) && !editing && (
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                          <p className="text-sm text-gray-600 mb-2">No skills added yet</p>
                          <p className="text-xs text-gray-500">Click "Edit Profile" to add your skills and expertise</p>
                        </div>
                      )}
                    </div>
                    {editing && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add a new skill"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleAddSkill();
                              }
                            }}
                          />
                          <Button 
                            onClick={handleAddSkill}
                            disabled={!newSkill.trim()}
                            size="sm"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          Press Enter or click the + button to add a skill
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="career" className="space-y-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Career Insights</h3>
              <p className="text-gray-600">Personalized growth recommendations based on your profile and industry trends</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {careerTips.map((tip, index) => (
                <motion.div
                  key={tip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          <CardTitle className="text-lg">{tip.title}</CardTitle>
                        </div>
                        <div className="flex items-center space-x-2">
                          {tip.difficulty && (
                            <Badge variant="outline" className={`${
                              tip.difficulty === 'Beginner' ? 'bg-green-50 text-green-700 border-green-200' :
                              tip.difficulty === 'Intermediate' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {tip.difficulty}
                            </Badge>
                          )}
                          {tip.relevance_score && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {tip.relevance_score}/10
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">{tip.category}</Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">{tip.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Course Recommendations</h3>
              <p className="text-gray-600">Personalized learning paths based on your skills, experience, and career goals</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="overflow-hidden">
                    <div className="aspect-video bg-gray-200 relative overflow-hidden group">
                      <img 
                        src={course.thumbnail} 
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to play button if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = '<div class="flex items-center justify-center h-full bg-gradient-to-br from-blue-100 to-purple-100"><svg class="h-12 w-12 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg></div>';
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 flex items-center justify-center transition-all duration-300">
                        <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm line-clamp-2">{course.title}</h3>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {course.provider}
                          </Badge>
                          {course.is_upskill && (
                            <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                              🚀 Upskilling
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Skills tags */}
                      {course.skills && course.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {course.skills.slice(0, 3).map((skill, idx) => (
                            <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {skill}
                            </span>
                          ))}
                          {course.skills.length > 3 && (
                            <span className="text-xs text-gray-500">+{course.skills.length - 3} more</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                        <span>{course.duration}</span>
                        <div className="flex items-center space-x-2">
                          <span>⭐ {course.rating}</span>
                          {course.difficulty && (
                            <span className={`px-1 py-0.5 rounded text-xs ${
                              course.difficulty === 'Beginner' ? 'bg-green-100 text-green-700' :
                              course.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {course.difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {course.relevance_score && (
                        <div className="text-xs text-gray-500 mb-2">
                          Relevance: {course.relevance_score}/10
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-3"
                        onClick={() => window.open(course.url, '_blank')}
                      >
                        <BookOpen className="h-4 w-4 mr-2" />
                        View Course
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Refer a Friend</h3>
              <p className="text-gray-600">Help us find great talent by referring your network</p>
            </div>

            {/* Referral Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    <span>General Referral</span>
                  </CardTitle>
                  <CardDescription>
                    Refer someone for any open opportunity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleReferFriend} className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Refer a Friend
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-green-600" />
                    <span>Targeted Referrals</span>
                  </CardTitle>
                  <CardDescription>
                    Refer someone for a specific opportunity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {opportunities.slice(0, 3).map((opportunity) => (
                      <Button
                        key={opportunity.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleReferForOpportunity(opportunity.id)}
                      >
                        <Target className="h-4 w-4 mr-2" />
                        {opportunity.title}
                      </Button>
                    ))}
                    {opportunities.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{opportunities.length - 3} more opportunities
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Referred Talents */}
            <div>
              <h4 className="text-xl font-semibold text-gray-900 mb-4">Your Referrals</h4>
              {referredTalents.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No referrals yet</h3>
                    <p className="text-gray-600 mb-4">Start referring talented people from your network</p>
                    <Button onClick={handleReferFriend}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Make Your First Referral
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {referredTalents.map((talent, index) => (
                    <motion.div
                      key={talent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="h-full">
                        <CardHeader className="pb-4">
                          <div className="flex items-start space-x-3">
                            <Avatar className="h-14 w-14">
                              <AvatarImage src={talent.avatar_url || ''} />
                              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                                {talent.first_name?.[0]}{talent.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 text-lg leading-tight">
                                {talent.first_name} {talent.last_name}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">{talent.email}</p>
                              <Badge variant="secondary" className="mt-2 text-xs">
                                {talent.talent_role}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Experience</span>
                              <span className="text-sm font-medium">{talent.years_experience} years</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Location</span>
                              <span className="text-sm font-medium">{talent.location}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Status</span>
                              <Badge 
                                variant={talent.prospect_status === 'available' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {talent.prospect_status || 'Available'}
                              </Badge>
                            </div>
                            {talent.referred_for_opportunity && (
                              <div className="flex items-start justify-between">
                                <span className="text-sm text-gray-600">Referred for</span>
                                <span className="text-sm font-medium text-right max-w-[60%] leading-tight">
                                  {opportunities.find(opp => opp.id === talent.referred_for_opportunity)?.title || 'Specific Opportunity'}
                                </span>
                              </div>
                            )}
                            {talent.referred_by && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Referred by</span>
                                <span className="text-sm font-medium">
                                  {users.find(user => user.id === talent.referred_by)?.first_name && users.find(user => user.id === talent.referred_by)?.last_name 
                                    ? `${users.find(user => user.id === talent.referred_by)?.first_name} ${users.find(user => user.id === talent.referred_by)?.last_name}`
                                    : users.find(user => user.id === talent.referred_by)?.email || 'Unknown User'}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Referred</span>
                              <span className="text-sm font-medium">
                                {new Date(talent.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          {talent.skills && talent.skills.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <p className="text-sm text-gray-600 mb-2 font-medium">Skills</p>
                              <div className="flex flex-wrap gap-1.5">
                                {talent.skills.slice(0, 3).map((skill, idx) => (
                                  <span key={idx} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                                    {skill}
                                  </span>
                                ))}
                                {talent.skills.length > 3 && (
                                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                                    +{talent.skills.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
