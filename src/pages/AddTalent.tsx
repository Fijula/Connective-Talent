import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Upload, FileText, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import PhotoUpload from '@/components/PhotoUpload';
import FileUpload from '@/components/FileUpload';
import BulkImport from '@/components/BulkImport';
import ResumeUpload from '@/components/ResumeUpload';

const talentSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  talentType: z.enum(['existing', 'prospect']),
  talentRole: z.string().min(1, 'Role is required'),
  bio: z.string().optional(),
  education: z.string().optional(),
  workExperience: z.string().optional(),
  certifications: z.string().optional(),
  location: z.string().optional(),
  timezone: z.string().optional(),
  yearsExperience: z.number().min(0).optional(),
  // hourlyRate removed
  remotePreference: z.boolean(),
  availabilityStartDate: z.string().optional(),
  projects: z.array(z.object({
    projectName: z.string(),
    reportingManager: z.string(),
    utilizationPercentage: z.number(),
    releaseDate: z.string().optional()
  })).optional(),
  prospectStatus: z.enum(['available', 'interviewing', 'rejected', 'inactive']).optional(),
  skills: z.string().optional(),
  source: z.enum(['employee_referral', 'direct_application', 'active_sourcing', 'linkedin_outreach', 'job_board', 'university_recruiting', 'industry_event']).optional(),
  referredForOpportunity: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  resumeUrl: z.string().url().optional().or(z.literal(''))
}).refine((data) => {
  // If talent type is existing, at least one project is required with valid data
  if (data.talentType === 'existing') {
    return data.projects && 
           data.projects.length > 0 && 
           data.projects.every(project => 
             project.projectName.trim() !== '' && 
             project.reportingManager.trim() !== ''
           );
  }
  return true;
}, {
  message: "At least one project with valid project name and reporting manager is required for existing employees",
  path: ["projects"] // This will show the error on the projects field
});

type TalentFormData = z.infer<typeof talentSchema>;

const AddTalent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [projects, setProjects] = useState<Array<{ projectName: string; reportingManager: string; utilizationPercentage: number; releaseDate: string }>>([{ projectName: '', reportingManager: '', utilizationPercentage: 0, releaseDate: '' }]);
  const [skillsInput, setSkillsInput] = useState('');
  
  // Referral mode state
  const isReferralMode = searchParams.get('referral_mode') === 'true';
  const referredBy = searchParams.get('referred_by') || '';
  const referredForOpportunity = searchParams.get('referred_for_opportunity') || '';
  
  const parsedForm = useForm<TalentFormData>({
    resolver: zodResolver(talentSchema),
    defaultValues: { 
      remotePreference: true, 
      yearsExperience: 0,
      talentType: isReferralMode ? 'prospect' : 'existing',
      source: isReferralMode ? 'employee_referral' : undefined,
      prospectStatus: isReferralMode ? 'available' : undefined
    }
  });
  const [parsedSkillsInput, setParsedSkillsInput] = useState('');
  
  // Edit mode state
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);
  const [originalData, setOriginalData] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [showParsedForm, setShowParsedForm] = useState(false);

  console.log('AddTalent: editId:', editId, 'isEditMode:', isEditMode);
  
  // Debug function to log when photo is selected
  const handlePhotoSelect = (file: File) => {
    console.log('AddTalent: Photo selected:', file.name, file.size);
    setProfilePhoto(file);
  };
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [referredByUser, setReferredByUser] = useState<any>(null);

  // Fetch opportunities for referral dropdown
  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('id, title, status')
        .eq('status', 'open')
        .order('title');

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    }
  };

  // Fetch referred by user information
  const fetchReferredByUser = async () => {
    if (isReferralMode && referredBy) {
      try {
        console.log('Fetching user info for referredBy:', referredBy);
        
        // Check if referredBy is an email or ID
        const isEmail = referredBy.includes('@');
        console.log('Is email lookup:', isEmail);
        
        const { data, error } = await supabase
          .from('users')
          .select('id, email, first_name, last_name')
          .eq(isEmail ? 'email' : 'id', referredBy)
          .single();

        if (error) {
          console.error('Error fetching referred by user:', error);
          throw error;
        }
        
        console.log('Found referred by user:', data);
        setReferredByUser(data);
      } catch (error) {
        console.error('Error fetching referred by user:', error);
        // If user lookup fails, we'll save null for referred_by
        setReferredByUser(null);
      }
    }
  };

  // Load opportunities and referred by user on component mount
  useEffect(() => {
    fetchOpportunities();
    fetchReferredByUser();
  }, []);

  // Handle parsed resume data
  const handleParsedResumeData = (parsedData: any) => {
    console.log('Parsed resume data:', parsedData);
    
    const formatExperience = (items: any[]): string => {
      if (!Array.isArray(items) || items.length === 0) return '';
      return items
        .map((exp: any) => {
          if (typeof exp === 'string') return `• ${exp}`;
          const title = exp.title || '';
          const company = exp.company ? ` at ${exp.company}` : '';
          const period = exp.duration || [exp.startDate, exp.endDate].filter(Boolean).join(' - ');
          const header = [title + company, period ? `(${period})` : ''].filter(Boolean).join(' ');
          const desc = exp.description ? `\n${exp.description}` : '';
          return `• ${header}${desc}`.trim();
        })
        .join('\n');
    };

    const educationText = Array.isArray(parsedData.education)
      ? parsedData.education.map((e: any) => `• ${String(e)}`).join('\n')
      : '';
    const certificationsText = Array.isArray(parsedData.certifications)
      ? parsedData.certifications.map((c: any) => `• ${String(c)}`).join('\n')
      : '';
    const workExpText = formatExperience(parsedData.workExperience || []);

    // Prefill parsed form only
    parsedForm.reset({
      firstName: parsedData.firstName || '',
      lastName: parsedData.lastName || '',
      email: parsedData.email || '',
      talentType: 'prospect' as const, // Default to prospect for new resumes
      talentRole: '', // Let user select
      bio: parsedData.bio || '',
      education: educationText,
      workExperience: workExpText,
      certifications: certificationsText,
      location: parsedData.location || '',
      timezone: '',
      yearsExperience: parsedData.yearsExperience || 0,
      remotePreference: true,
      availabilityStartDate: '',
      source: isReferralMode ? 'employee_referral' as const : 'direct_application' as const,
      skills: parsedData.skills ? parsedData.skills.join(', ') : '',
      linkedinUrl: parsedData.linkedinUrl || '',
      githubUrl: parsedData.githubUrl || '',
      portfolioUrl: parsedData.portfolioUrl || '',
      resumeUrl: '', // Will be set after file upload
      prospectStatus: isReferralMode ? 'available' as const : undefined,
      referredForOpportunity: isReferralMode ? referredForOpportunity : undefined,
    });

    // Set parsed skills input (keep manual form untouched)
    setParsedSkillsInput(parsedData.skills ? parsedData.skills.join(', ') : '');

    // Clear any previous parsed sections cache
    (form as any)._parsedSections = undefined;
    
    // Show the form below resume upload
    setShowParsedForm(true);
    
    toast({
      title: "Resume Parsed Successfully!",
      description: "Form has been prefilled with data from your resume. Please review and complete any missing fields.",
    });
  };

  const handleResumeParseError = (error: string) => {
    toast({
      title: "Resume Parsing Failed",
      description: error,
      variant: "destructive",
    });
  };

  const form = useForm<TalentFormData>({
    resolver: zodResolver(talentSchema),
    defaultValues: {
      remotePreference: true,
      yearsExperience: 0,
      prospectStatus: 'available',
      projects: [{ projectName: '', reportingManager: '', utilizationPercentage: 0, releaseDate: '' }],
      talentType: isReferralMode ? 'prospect' : 'existing',
      source: isReferralMode ? 'employee_referral' : undefined,
      referredForOpportunity: isReferralMode ? referredForOpportunity : undefined,
    }
  });

  // Load talent data for editing
  useEffect(() => {
    if (isEditMode && editId) {
      const loadTalentData = async () => {
        try {
          // Fetch talent profile
          const { data: talentData, error: talentError } = await supabase
            .from('talent_profiles')
            .select('*')
            .eq('id', editId)
            .single();

          if (talentError) throw talentError;

          console.log('Loaded talent data:', talentData);
          console.log('Talent role:', talentData.talent_role);
          console.log('Talent type:', talentData.talent_type);
          console.log('Location:', talentData.location);
          console.log('Avatar URL:', talentData.avatar_url);

          // Fetch projects if existing employee
          let projectsData = [];
          if (talentData.talent_type === 'existing') {
            const { data: projects, error: projectsError } = await supabase
              .from('employee_projects')
              .select('*')
              .eq('talent_profile_id', editId);

            if (projectsError) throw projectsError;
            projectsData = projects || [];
          }

          // Set original data for change tracking
          setOriginalData({
            ...talentData,
            projects: projectsData
          });

          // Populate form with existing data
          const formData = {
            firstName: talentData.first_name || '',
            lastName: talentData.last_name || '',
            email: talentData.email || '',
            talentType: (talentData.talent_type as 'existing' | 'prospect') || 'prospect',
            talentRole: talentData.talent_role || '',
            bio: talentData.bio || '',
            education: talentData.education || '',
            workExperience: talentData.work_experience || '',
            certifications: talentData.certifications || '',
            location: talentData.location || '',
            timezone: talentData.timezone || '',
            yearsExperience: talentData.years_experience || 0,
            // hourly rate removed
            remotePreference: talentData.remote_preference || true,
            availabilityStartDate: talentData.availability_start_date || '',
            source: (talentData.source as 'employee_referral' | 'direct_application' | 'active_sourcing' | 'linkedin_outreach' | 'job_board' | 'university_recruiting' | 'industry_event') || undefined,
            skills: talentData.skills ? talentData.skills.join(', ') : '',
            linkedinUrl: talentData.linkedin_url || '',
            githubUrl: talentData.github_url || '',
            portfolioUrl: talentData.portfolio_url || '',
            resumeUrl: talentData.resume_url || '',
            prospectStatus: (talentData.prospect_status as 'available' | 'interviewing' | 'rejected' | 'inactive') || 'available',
          };

          console.log('Form data being set:', formData);
          
          // Reset form with the loaded data
          form.reset(formData);
          console.log('Form values after reset:', form.getValues());

          // Set projects for existing employees
          if (projectsData.length > 0) {
            setProjects(projectsData.map(p => ({
              projectName: p.project_name,
              reportingManager: p.reporting_manager,
              utilizationPercentage: p.utilization_percentage,
              releaseDate: p.release_date || ''
            })));
          }

          // Set skills input
          setSkillsInput(talentData.skills ? talentData.skills.join(', ') : '');

          // Set existing avatar URL for display
          console.log('Setting existing avatar URL:', talentData.avatar_url);
          setExistingAvatarUrl(talentData.avatar_url);

        } catch (error) {
          console.error('Error loading talent data:', error);
          toast({
            title: "Error",
            description: "Failed to load talent data for editing.",
            variant: "destructive",
          });
          navigate('/talent-pool');
        }
      };

      loadTalentData();
    }
  }, [isEditMode, editId, form, navigate, toast]);

  // Track changes to enable/disable save button
  useEffect(() => {
    if (isEditMode && originalData) {
      const currentData = form.getValues();
      const currentProjects = projects;
      
      // Compare current form data with original data
      const hasFormChanges = JSON.stringify({
        firstName: currentData.firstName,
        lastName: currentData.lastName,
        email: currentData.email,
        talentType: currentData.talentType,
        talentRole: currentData.talentRole,
        bio: currentData.bio,
        location: currentData.location,
        timezone: currentData.timezone,
        yearsExperience: currentData.yearsExperience,
        // hourly rate removed
        remotePreference: currentData.remotePreference,
        availabilityStartDate: currentData.availabilityStartDate,
        source: currentData.source,
        skills: currentData.skills,
        linkedinUrl: currentData.linkedinUrl,
        githubUrl: currentData.githubUrl,
        portfolioUrl: currentData.portfolioUrl,
        resumeUrl: currentData.resumeUrl,
        prospectStatus: currentData.prospectStatus
      }) !== JSON.stringify({
        firstName: originalData.first_name || '',
        lastName: originalData.last_name || '',
        email: originalData.email || '',
        talentType: originalData.talent_type || 'prospect',
        talentRole: originalData.talent_role || '',
        bio: originalData.bio || '',
        location: originalData.location || '',
        timezone: originalData.timezone || '',
        yearsExperience: originalData.years_experience || 0,
        // hourly rate removed
        remotePreference: originalData.remote_preference || true,
        availabilityStartDate: originalData.availability_start_date || '',
        source: originalData.source || '',
        skills: originalData.skills ? originalData.skills.join(', ') : '',
        linkedinUrl: originalData.linkedin_url || '',
        githubUrl: originalData.github_url || '',
        portfolioUrl: originalData.portfolio_url || '',
        resumeUrl: originalData.resume_url || '',
        prospectStatus: originalData.prospectStatus || ''
      });

      // Compare projects
      const hasProjectChanges = JSON.stringify(currentProjects) !== JSON.stringify(
        originalData.projects?.map(p => ({
          projectName: p.project_name,
          reportingManager: p.reporting_manager,
          utilizationPercentage: p.utilization_percentage
        })) || []
      );

      setHasChanges(hasFormChanges || hasProjectChanges);
    }
  }, [form.watch(), projects, isEditMode, originalData]);

  const bulkImportFields = [
    'first_name',
    'last_name',
    'email',
    'talent_role',
    'talent_type',
    'years_experience',
    'location',
    'remote_preference',
    'availability_start_date',
    'source',
    'skills',
    'linkedin_url',
    'github_url',
    'portfolio_url',
    'bio',
    'education',
    'work_experience',
    'certifications',
    'existing_project_name',
    'existing_project_manager',
    'existing_project_utilization'
  ];

  const handleBulkImport = async (data: any[]) => {
    if (!user) return;
    // Find user id (no need for separate manager table)
    const userId = user.id;

    for (const row of data) {
      const payload: any = {
        manager_id: userId,
        first_name: row.first_name || null,
        last_name: row.last_name || null,
        email: row.email,
        talent_role: row.talent_role,
        talent_type: row.talent_type || 'prospect',
        years_experience: row.years_experience ? Number(row.years_experience) : 0,
        location: row.location || null,
        remote_preference: String(row.remote_preference).toLowerCase() === 'true',
        availability_start_date: row.availability_start_date || null,
        source: row.source || null,
        skills: row.skills ? String(row.skills).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        linkedin_url: row.linkedin_url || null,
        github_url: row.github_url || null,
        portfolio_url: row.portfolio_url || null,
        bio: row.bio || null,
        education: row.education || null,
        work_experience: row.work_experience || null,
        certifications: row.certifications || null,
        status: 'available'
      };
      const { error } = await supabase.from('talent_profiles').insert(payload);
      if (error) throw error;

      // If an existing employee has an initial project in the sheet, insert it
      if ((row.talent_type || 'prospect') === 'existing' && (row.existing_project_name || row.existing_project_manager || row.existing_project_utilization)) {
        const profileRes = await supabase.from('talent_profiles').select('id').eq('email', row.email).order('created_at', { ascending: false }).limit(1).single();
        if (!profileRes.error && profileRes.data) {
          const util = Number(row.existing_project_utilization || 0);
          await supabase.from('employee_projects').insert({
            talent_profile_id: profileRes.data.id,
            project_name: row.existing_project_name || 'N/A',
            reporting_manager: row.existing_project_manager || 'N/A',
            utilization_percentage: isNaN(util) ? 0 : util
          });
        }
      }
    }
  };

  const onSubmit = async (data: TalentFormData) => {
    console.log('onSubmit called with data:', data);
    if (!user) {
      console.log('No user found, returning early');
      return;
    }
    
    console.log('Starting form submission...');
    setIsLoading(true);
    try {
      // Use current user's ID directly
      const userId = user.id;

      let avatarUrl = null;

      // Handle photo upload if provided
      if (profilePhoto) {
        console.log('Uploading photo:', profilePhoto.name, profilePhoto.size);
        const fileExt = profilePhoto.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `talent-avatars/${fileName}`;

        console.log('Uploading to path:', filePath);

        // Upload photo to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, profilePhoto);

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
          toast({
            title: "Warning",
            description: "Profile photo upload failed, but talent profile was updated.",
            variant: "destructive",
          });
        } else {
          // Get public URL for the uploaded photo
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl;
          console.log('Photo uploaded successfully:', publicUrl);
        }
      } else if (isEditMode && originalData?.avatar_url) {
        // Keep existing avatar if no new photo uploaded
        avatarUrl = originalData.avatar_url;
      }

      const talentProfileData = {
        manager_id: userId,
            email: data.email,
            first_name: data.firstName,
            last_name: data.lastName,
        talent_type: data.talentType,
            talent_role: data.talentRole as any,
            bio: data.bio || null,
        skills: data.skills ? data.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0) : [],
        source: data.source || null,
            location: data.location || null,
            timezone: data.timezone || null,
            years_experience: data.yearsExperience || 0,
        // hourly_rate removed
            remote_preference: data.remotePreference,
            availability_start_date: data.availabilityStartDate || null,
            linkedin_url: data.linkedinUrl || null,
            github_url: data.githubUrl || null,
            portfolio_url: data.portfolioUrl || null,
            resume_url: data.resumeUrl || null,
        avatar_url: avatarUrl,
        education: data.education || null,
        certifications: data.certifications || null,
        work_experience: data.workExperience || null,
        prospect_status: data.prospectStatus || 'available',
        referred_by: isReferralMode ? (referredByUser?.id || referredBy) : null,
        referred_for_opportunity: (data.referredForOpportunity && data.referredForOpportunity !== 'none') ? data.referredForOpportunity : (isReferralMode ? referredForOpportunity : null),
      };

      console.log('Saving talent profile with referral data:', {
        referred_by: talentProfileData.referred_by,
        referred_for_opportunity: talentProfileData.referred_for_opportunity,
        isReferralMode,
        referredByUser: referredByUser,
        referredBy: referredBy
      });

      let talentData;

      if (isEditMode) {
        // Update existing talent profile
        const { data: updatedTalent, error: updateError } = await supabase
          .from('talent_profiles')
          .update(talentProfileData)
          .eq('id', editId)
          .select('id')
          .single();

        if (updateError) {
          console.error('Talent profile update error:', updateError);
          throw updateError;
        }
        talentData = updatedTalent;
      } else {
        // Create new talent profile
        const { data: newTalent, error: createError } = await supabase
          .from('talent_profiles')
          .insert(talentProfileData)
          .select('id')
          .single();

        if (createError) {
          console.error('Talent profile creation error:', createError);
          throw createError;
        }
        talentData = newTalent;
      }

      // Handle project assignments for existing employees
      if (data.talentType === 'existing') {
        if (isEditMode) {
          // Delete existing projects and insert new ones
          const { error: deleteError } = await supabase
            .from('employee_projects')
            .delete()
            .eq('talent_profile_id', editId);

          if (deleteError) {
            console.error('Error deleting existing projects:', deleteError);
            throw deleteError;
          }
        }

        // Insert new projects
        if (data.projects && data.projects.length > 0) {
          const { error: projectsError } = await supabase
            .from('employee_projects')
            .insert(
              data.projects.map(project => ({
                talent_profile_id: talentData.id,
                project_name: project.projectName,
                reporting_manager: project.reportingManager,
                utilization_percentage: project.utilizationPercentage,
                release_date: project.releaseDate || null
              }))
            );

          if (projectsError) {
            console.error('Projects creation error:', projectsError);
            throw projectsError;
          }
        }
      }

      toast({
        title: "Success!",
        description: isEditMode ? "Talent profile updated successfully." : "Talent profile created successfully.",
      });
      
      // Navigate based on mode
      if (isReferralMode) {
        navigate('/user-dashboard?tab=referrals');
      } else {
        navigate('/talent-pool');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} talent profile:`, error);
      toast({
        title: "Error",
        description: `Failed to ${isEditMode ? 'update' : 'create'} talent profile. Please try again.`,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={`grid w-full ${isReferralMode ? 'grid-cols-2' : 'grid-cols-3'}`}>
              <TabsTrigger value="manual" className="flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Manual Entry</span>
              </TabsTrigger>
              <TabsTrigger value="resume" className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>Resume Upload</span>
              </TabsTrigger>
              {!isReferralMode && (
                <TabsTrigger value="bulk" className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Bulk Import</span>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="manual" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-6 w-6 text-primary" />
                    <span>{isEditMode ? 'Edit Talent Profile' : 'Add New Talent'}</span>
                  </CardTitle>
                  <CardDescription>
                    {isEditMode ? 'Update the talent profile with new information' : 'Create a comprehensive talent profile with skills and experience'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PhotoUpload
                    onPhotoSelect={handlePhotoSelect}
                    currentPhoto={existingAvatarUrl}
                    initials={`${form.watch('firstName')?.charAt(0) || ''}${form.watch('lastName')?.charAt(0) || ''}`}
                    name={`${form.watch('firstName') || ''} ${form.watch('lastName') || ''}`}
                  />

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                      console.log('Form validation errors:', errors);
                    })} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="John" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input placeholder="john@company.com" type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="talentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Talent Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select talent type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="existing">Existing Tech9 Employee</SelectItem>
                                <SelectItem value="prospect">New Prospect</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Prospect status field for new prospects */}
                      {form.watch('talentType') === 'prospect' && (
                        <FormField
                          control={form.control}
                          name="prospectStatus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="available">Available</SelectItem>
                                  <SelectItem value="interviewing">In Selection Process</SelectItem>
                                  <SelectItem value="rejected">Rejected</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Dynamic project fields for existing employees */}
                      {form.watch('talentType') === 'existing' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-medium">Project Assignments *</h3>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setProjects([...projects, { projectName: '', reportingManager: '', utilizationPercentage: 0, releaseDate: '' }])}
                            >
                              Add Project
                            </Button>
                          </div>
                          {projects.map((project, index) => (
                            <div key={index} className="space-y-4 p-4 border rounded-lg">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <label className="text-sm font-medium">Project Name *</label>
                                  <Input
                                    placeholder="Enter project name"
                                    value={project.projectName}
                                    onChange={(e) => {
                                      const newProjects = [...projects];
                                      newProjects[index].projectName = e.target.value;
                                      setProjects(newProjects);
                                      form.setValue('projects', newProjects);
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Reporting Manager *</label>
                                  <Input
                                    placeholder="Enter manager name"
                                    value={project.reportingManager}
                                    onChange={(e) => {
                                      const newProjects = [...projects];
                                      newProjects[index].reportingManager = e.target.value;
                                      setProjects(newProjects);
                                      form.setValue('projects', newProjects);
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Utilization % *</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="0"
                                    value={project.utilizationPercentage === 0 ? '' : project.utilizationPercentage}
                                    onChange={(e) => {
                                      const newProjects = [...projects];
                                      const value = e.target.value;
                                      // Allow empty string for manual editing, convert to 0 only when needed
                                      newProjects[index].utilizationPercentage = value === '' ? 0 : parseInt(value) || 0;
                                      setProjects(newProjects);
                                      form.setValue('projects', newProjects);
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Release Date</label>
                                  <Input
                                    type="date"
                                    value={project.releaseDate || ''}
                                    onChange={(e) => {
                                      const newProjects = [...projects];
                                      newProjects[index].releaseDate = e.target.value;
                                      setProjects(newProjects);
                                      form.setValue('projects', newProjects);
                                    }}
                                  />
                                </div>
                              </div>
                              {projects.length > 1 && (
                                <div className="flex justify-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newProjects = projects.filter((_, i) => i !== index);
                                      setProjects(newProjects);
                                      form.setValue('projects', newProjects);
                                    }}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="talentRole"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Role *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="engineer">Engineer</SelectItem>
                                  <SelectItem value="designer">Designer</SelectItem>
                                  <SelectItem value="pm">Product Manager</SelectItem>
                                  <SelectItem value="qa">QA Engineer</SelectItem>
                                  <SelectItem value="data_scientist">Data Scientist</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="yearsExperience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Years of Experience</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  {...field} 
                                  value={field.value || ''}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="bio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Tell us about yourself, your expertise, and what you're passionate about..."
                                className="min-h-[140px] whitespace-pre-wrap leading-6 font-mono text-sm"
                                rows={6}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                        <FormField
                          control={form.control}
                        name="skills"
                          render={({ field }) => (
                            <FormItem>
                            <FormLabel>Skills</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter skills separated by commas (e.g., React, TypeScript, Node.js)"
                                value={skillsInput}
                                onChange={(e) => {
                                  setSkillsInput(e.target.value);
                                  // Convert comma-separated string to array and set in form
                                  const skillsArray = e.target.value
                                    .split(',')
                                    .map(skill => skill.trim())
                                    .filter(skill => skill.length > 0);
                                  form.setValue('skills', e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Education, Work Experience, Certifications */}
                      <div className="grid grid-cols-1 gap-6">
                        <FormField
                          control={form.control}
                          name="education"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Education</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={"Add your education details here"}
                                  className="min-h-[140px] whitespace-pre-wrap font-mono text-sm"
                                  rows={6}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="workExperience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Work Experience</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={"Add your work experience here"}
                                  className="min-h-[140px] whitespace-pre-wrap font-mono text-sm"
                                  rows={6}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="certifications"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Certifications</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={"Add your certifications here"}
                                  className="min-h-[140px] whitespace-pre-wrap font-mono text-sm"
                                  rows={6}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Source, Availability, and Location fields - only for prospects */}
                      {form.watch('talentType') === 'prospect' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <FormField
                            control={form.control}
                            name="source"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>How did you find this talent?</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select source" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="employee_referral">Employee Referral</SelectItem>
                                    <SelectItem value="direct_application">Direct Application</SelectItem>
                                    <SelectItem value="active_sourcing">Active Sourcing</SelectItem>
                                    <SelectItem value="linkedin_outreach">LinkedIn Outreach</SelectItem>
                                    <SelectItem value="job_board">Job Board</SelectItem>
                                    <SelectItem value="university_recruiting">University Recruiting</SelectItem>
                                    <SelectItem value="industry_event">Industry Event</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Opportunity dropdown for employee referrals */}
                        {form.watch('source') === 'employee_referral' && (
                          <FormField
                            control={form.control}
                            name="referredForOpportunity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Which opportunity is this referral for?</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select opportunity (optional)" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">No specific opportunity</SelectItem>
                                    {opportunities.map((opp) => (
                                      <SelectItem key={opp.id} value={opp.id}>
                                        {opp.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={form.control}
                            name="availabilityStartDate"
                          render={({ field }) => (
                            <FormItem>
                                <FormLabel>When are they available to start?</FormLabel>
                              <FormControl>
                                <Input 
                                    type="date"
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="location"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Location</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select location" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="San Francisco, CA">San Francisco, CA</SelectItem>
                                  <SelectItem value="New York, NY">New York, NY</SelectItem>
                                  <SelectItem value="Austin, TX">Austin, TX</SelectItem>
                                  <SelectItem value="Seattle, WA">Seattle, WA</SelectItem>
                                  <SelectItem value="Chicago, IL">Chicago, IL</SelectItem>
                                  <SelectItem value="Boston, MA">Boston, MA</SelectItem>
                                  <SelectItem value="Los Angeles, CA">Los Angeles, CA</SelectItem>
                                  <SelectItem value="Denver, CO">Denver, CO</SelectItem>
                                  <SelectItem value="Miami, FL">Miami, FL</SelectItem>
                                  <SelectItem value="Remote">Remote</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="remotePreference"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-3">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-medium">
                              Open to remote work
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="linkedinUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>LinkedIn URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://linkedin.com/in/username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="githubUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GitHub URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://github.com/username" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex gap-4">
                        {isEditMode && (
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => navigate(`/talent-profile/${editId}`)}
                            disabled={isLoading}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button 
                          type="submit" 
                          className={isEditMode ? "flex-1" : "w-full"}
                          disabled={isLoading || (isEditMode && !hasChanges)}
                        >
                        {isLoading && <Plus className="mr-2 h-4 w-4 animate-spin" />}
                          {isEditMode ? 'Update Talent Profile' : 'Add Talent Profile'}
                      </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resume" className="space-y-6">
              <ResumeUpload
                onParsedData={handleParsedResumeData}
                onError={handleResumeParseError}
              />
              
              {/* Show parsed form below resume upload */}
              {showParsedForm && (
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Plus className="h-6 w-6 text-primary" />
                      <span>Complete Talent Profile</span>
                    </CardTitle>
                    <CardDescription>
                      Review and complete the information extracted from your resume
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <PhotoUpload
                      onPhotoSelect={handlePhotoSelect}
                      currentPhoto={existingAvatarUrl}
                      initials={`${parsedForm.watch('firstName')?.charAt(0) || ''}${parsedForm.watch('lastName')?.charAt(0) || ''}`}
                      name={`${parsedForm.watch('firstName') || ''} ${parsedForm.watch('lastName') || ''}`}
                    />

                    <Form {...parsedForm}>
                      <form onSubmit={parsedForm.handleSubmit(onSubmit, (errors) => {
                        console.log('ParsedForm validation errors:', errors);
                      })} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <FormField
                            control={parsedForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="John" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={parsedForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Doe" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={parsedForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="john@example.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={parsedForm.control}
                            name="talentType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Talent Type *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select talent type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="existing">Existing Employee</SelectItem>
                                    <SelectItem value="prospect">New Prospect</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={parsedForm.control}
                            name="talentRole"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Role *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="engineer">Engineer</SelectItem>
                                    <SelectItem value="designer">Designer</SelectItem>
                                    <SelectItem value="pm">PM</SelectItem>
                                    <SelectItem value="data">Data</SelectItem>
                                    <SelectItem value="qa">QA</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={parsedForm.control}
                            name="yearsExperience"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Years of Experience</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="5" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={parsedForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select location" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Remote">Remote</SelectItem>
                                    <SelectItem value="San Francisco, CA">San Francisco, CA</SelectItem>
                                    <SelectItem value="New York, NY">New York, NY</SelectItem>
                                    <SelectItem value="Austin, TX">Austin, TX</SelectItem>
                                    <SelectItem value="Seattle, WA">Seattle, WA</SelectItem>
                                    <SelectItem value="Boston, MA">Boston, MA</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Hourly rate removed */}

                          <FormField
                            control={parsedForm.control}
                            name="skills"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Skills (comma-separated)</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="React, TypeScript, Node.js" 
                                    {...field}
                                    value={parsedSkillsInput}
                                    onChange={(e) => {
                                      setParsedSkillsInput(e.target.value);
                                      field.onChange(e.target.value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={parsedForm.control}
                            name="linkedinUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>LinkedIn URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://linkedin.com/in/username" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={parsedForm.control}
                            name="githubUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>GitHub URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://github.com/username" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={parsedForm.control}
                            name="portfolioUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Portfolio URL</FormLabel>
                                <FormControl>
                                  <Input placeholder="https://portfolio.com" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={parsedForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Tell us about the candidate's background, experience, and skills..." 
                                  className="min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Education, Work Experience, Certifications (stacked) */}
                        <FormField
                          control={parsedForm.control}
                          name="education"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Education</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={"Add your education details here"}
                                  className="min-h-[120px] whitespace-pre-wrap font-mono text-sm"
                                  rows={5}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={parsedForm.control}
                          name="workExperience"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Work Experience</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={"Add your work experience here"}
                                  className="min-h-[120px] whitespace-pre-wrap font-mono text-sm"
                                  rows={5}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={parsedForm.control}
                          name="certifications"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Certifications</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder={"Add your certifications here"}
                                  className="min-h-[120px] whitespace-pre-wrap font-mono text-sm"
                                  rows={5}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Source Field */}
                        <FormField
                          control={parsedForm.control}
                          name="source"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>How did you find this talent?</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select source" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="employee_referral">Employee Referral</SelectItem>
                                  <SelectItem value="direct_application">Direct Application</SelectItem>
                                  <SelectItem value="active_sourcing">Active Sourcing</SelectItem>
                                  <SelectItem value="linkedin_outreach">LinkedIn Outreach</SelectItem>
                                  <SelectItem value="job_board">Job Board</SelectItem>
                                  <SelectItem value="university_recruiting">University Recruiting</SelectItem>
                                  <SelectItem value="industry_event">Industry Event</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Opportunity Field - only show in referral mode */}
                        {isReferralMode && (
                          <FormField
                            control={parsedForm.control}
                            name="referredForOpportunity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Which opportunity is this referral for?</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select opportunity" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="none">No specific opportunity</SelectItem>
                                    {opportunities.map((opp) => (
                                      <SelectItem key={opp.id} value={opp.id}>
                                        {opp.title}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Availability Start Date */}
                        <FormField
                          control={parsedForm.control}
                          name="availabilityStartDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>When are they available to start?</FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Prospect Status - only show in referral mode */}
                        {isReferralMode && (
                          <FormField
                            control={parsedForm.control}
                            name="prospectStatus"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="available">Available</SelectItem>
                                    <SelectItem value="interviewing">Interviewing</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <FormField
                          control={parsedForm.control}
                          name="remotePreference"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Remote Work Preference</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  This candidate prefers remote work
                                </div>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-4">
                          <Button 
                            type="submit" 
                            className="w-full"
                            disabled={isLoading}
                          >
                            {isLoading && <Plus className="mr-2 h-4 w-4 animate-spin" />}
                            Add Talent Profile
                    </Button>
                        </div>
                      </form>
                    </Form>
                </CardContent>
              </Card>
              )}
            </TabsContent>

            {!isReferralMode && (
            <TabsContent value="bulk" className="space-y-6">
              <BulkImport
                onImport={handleBulkImport}
                templateFields={bulkImportFields}
                requiredFields={[
                  'first_name','last_name','email','talent_role','talent_type'
                ]}
                optionalFields={[
                  'years_experience','location','remote_preference','availability_start_date','source','skills','linkedin_url','github_url','portfolio_url','bio','education','work_experience','certifications','existing_project_name','existing_project_manager','existing_project_utilization'
                ]}
                conditionalNotes={[
                  "If talent_type = 'existing': additional projects must be added later from the UI",
                  "If talent_type = 'prospect': availability_start_date and source recommended"
                ]}
                entityName="Talent"
              />
            </TabsContent>
            )}
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default AddTalent;