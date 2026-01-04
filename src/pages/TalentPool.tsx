import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, MapPin, TrendingUp, Clock, ArrowLeft, Calendar, Briefcase, Edit, Eye, DollarSign, Users, X, BarChart3, PieChart, Activity, Target, UserCheck, UserX, Building, Globe, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface TalentProfile {
  id: string;
  talent_role: string;
  years_experience?: number;
  hourly_rate?: number;
  bio?: string;
  location?: string;
  remote_preference?: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  talent_type?: string;
  skills?: string[];
  source?: string;
  avatar_url?: string;
  availability_start_date?: string | null;
  prospect_status?: 'available' | 'interviewing' | 'rejected' | 'inactive';
  employee_projects?: Array<{
    id: string;
    project_name: string;
    reporting_manager: string;
    utilization_percentage: number;
    release_date?: string | null;
  }>;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  talent_skills?: Array<{
    skill_id: string;
    proficiency_level: number;
    skills: { name: string };
  }>;
}

interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  required_role: string;
  location: string | null;
  remote_allowed: boolean | null;
  start_date: string | null;
  end_date: string | null;
  budget_min: number | null;
  budget_max: number | null;
  status: 'open' | 'filled' | 'cancelled' | 'on_hold';
  created_at: string;
  created_by: string;
  updated_at: string;
  fulfilled_by: string | null;
  fulfilled_at: string | null;
  fulfilled_candidate_id: string | null;
}

interface Assignment {
  id: string;
  opportunity_id: string;
  talent_profile_id: string;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  assigned_by: string;
  created_at: string;
  updated_at: string;
}


const OpportunitiesTab = ({ opportunityFilters, setOpportunityFilters, setIsOpportunityFilterDialogOpen, onDeleteClick, refreshOpportunities }: { opportunityFilters: any, setOpportunityFilters: any, setIsOpportunityFilterDialogOpen: any, onDeleteClick: (id: string, type: 'talent' | 'opportunity', name: string) => void, refreshOpportunities: () => Promise<void> }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [availableTalents, setAvailableTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOpportunities();
    fetchAvailableTalents();
  }, []);

  const handleOpportunityDelete = async (id: string, type: 'talent' | 'opportunity', name: string) => {
    console.log('Opportunity delete handler called:', { id, type, name });
    
    // Call the parent delete handler
    onDeleteClick(id, type, name);
  };

  // Listen for successful deletes and refresh opportunities
  useEffect(() => {
    const handleDeleteSuccess = () => {
      console.log('Delete success detected, refreshing opportunities');
      fetchOpportunities();
      refreshOpportunities();
    };

    // Listen for custom delete success event
    window.addEventListener('opportunityDeleted', handleDeleteSuccess);
    
    return () => {
      window.removeEventListener('opportunityDeleted', handleDeleteSuccess);
    };
  }, []);

  const fetchOpportunities = async () => {
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOpportunities(data || []);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to fetch opportunities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select('id, first_name, last_name, talent_role, status')
        .eq('status', 'available')
        .order('first_name');

      if (error) throw error;
      setAvailableTalents(data || []);
    } catch (error) {
      console.error('Error fetching talents:', error);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'filled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'engineer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'designer': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'pm': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'qa': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'data_scientist': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'pm': return 'PM';
      case 'qa': return 'QA';
      case 'data_scientist': return 'Data';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub Tabs and Buttons */}
      <div className="flex items-center justify-between">
        {/* Sub-tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeSubTab === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveSubTab('active')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeSubTab === 'active'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setActiveSubTab('inactive')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeSubTab === 'inactive'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inactive
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by title, role, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-80"
            />
          </div>
          
          <Button variant="outline" size="sm" onClick={() => setIsOpportunityFilterDialogOpen(true)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button onClick={() => navigate('/create-opportunity')} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Create Opportunity
          </Button>
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {opportunities.filter(opportunity => {
          // Search filtering
          const matchesSearch = !searchQuery || 
            opportunity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            opportunity.required_role.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (opportunity.location && opportunity.location.toLowerCase().includes(searchQuery.toLowerCase()));
          
          // Sub tab filtering
          let matchesSubTab = true;
          if (activeSubTab === 'active') {
            matchesSubTab = opportunity.status === 'open';
          } else if (activeSubTab === 'inactive') {
            matchesSubTab = opportunity.status !== 'open';
          }

          // Advanced filters
          const matchesStatus = opportunityFilters.status === 'all' || opportunity.status === opportunityFilters.status;
          const matchesRole = opportunityFilters.role === 'all' || opportunity.required_role === opportunityFilters.role;
          const matchesLocation = opportunityFilters.location === 'all' || 
            (opportunity.location && opportunity.location.toLowerCase().includes(opportunityFilters.location.toLowerCase()));
          const matchesStartDate = !opportunityFilters.startDate || 
            (opportunity.start_date && new Date(opportunity.start_date) >= new Date(opportunityFilters.startDate));
          
          return matchesSearch && matchesSubTab && matchesStatus && matchesRole && matchesLocation && matchesStartDate;
        }).map((opportunity, index) => (
          <motion.div
            key={opportunity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow h-full flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground line-clamp-2">
                      {opportunity.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={`${getRoleColor(opportunity.required_role)} hover:bg-white hover:text-black transition-colors`}>
                        {getRoleLabel(opportunity.required_role)}
                      </Badge>
                      <Badge className={`${getStatusColor(opportunity.status)} hover:bg-white hover:text-black transition-colors`}>
                        {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    console.log('Opportunity delete button clicked for:', opportunity.id);
                    e.stopPropagation();
                    handleOpportunityDelete(opportunity.id, 'opportunity', opportunity.title);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 flex-grow">
                {opportunity.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {opportunity.description}
                  </p>
                )}

                <div className="space-y-2">
                  {opportunity.location && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{opportunity.location}</span>
                      {opportunity.remote_allowed && (
                        <Badge variant="outline" className="text-xs">Remote OK</Badge>
                      )}
                    </div>
                  )}

                  {opportunity.start_date && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Start: {new Date(opportunity.start_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  {(opportunity.budget_min || opportunity.budget_max) && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>
                        {opportunity.budget_min && opportunity.budget_max
                          ? `$${opportunity.budget_min.toLocaleString()} - $${opportunity.budget_max.toLocaleString()}`
                          : opportunity.budget_min
                          ? `From $${opportunity.budget_min.toLocaleString()}`
                          : `Up to $${opportunity.budget_max?.toLocaleString()}`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Created {new Date(opportunity.created_at).toLocaleDateString()}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/opportunity/${opportunity.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Opportunity
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {opportunities.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No opportunities yet</h3>
          <p className="text-muted-foreground mb-4">Create your first opportunity to get started</p>
          <Button onClick={() => navigate('/create-opportunity')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Opportunity
          </Button>
        </div>
      )}

    </div>
  );
};

const TalentPool = () => {
  console.log('🎨 TalentPool component rendered!');
  const navigate = useNavigate();
  const { toast } = useToast();
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedTab, setSelectedTab] = useState('all');
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isOpportunityFilterDialogOpen, setIsOpportunityFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    talentType: 'all',
    status: 'all',
    role: 'all',
    location: 'all'
  });
  const [opportunityFilters, setOpportunityFilters] = useState({
    status: 'all',
    role: 'all',
    location: 'all',
    startDate: ''
  });
  const [stats, setStats] = useState({
    available: 0,
    rollingOff: 0,
    openRoles: 0,
    utilization: 0
  });
  const [analytics, setAnalytics] = useState({
    talentByRole: [],
    talentByStatus: [],
    talentByLocation: [],
    opportunitiesByStatus: [],
    opportunitiesByRole: [],
    utilizationTrends: [],
    monthlyHires: [],
    topSkills: [],
    existingByStatus: [],
    prospectsByStatus: []
  });
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'talent' | 'opportunity', name: string} | null>(null);

  useEffect(() => {
    fetchTalents();
    fetchStats();
    fetchAnalytics();
  }, []);

  const handleDeleteClick = (id: string, type: 'talent' | 'opportunity', name: string) => {
    console.log('handleDeleteClick called with:', { id, type, name });
    setItemToDelete({ id, type, name });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    console.log('handleDeleteConfirm called, itemToDelete:', itemToDelete);
    if (!itemToDelete) {
      console.log('No item to delete, returning');
      return;
    }

    console.log('Starting delete process for:', itemToDelete);

    try {
      if (itemToDelete.type === 'talent') {
        console.log('Deleting talent profile:', itemToDelete.id);
        
        // Check if talent profile exists
        const { data: existingTalent, error: checkError } = await supabase
          .from('talent_profiles')
          .select('id')
          .eq('id', itemToDelete.id)
          .single();
        
        if (checkError || !existingTalent) {
          throw new Error('Talent profile not found or access denied');
        }
        
        // First delete related data (employee_projects, talent_skills, etc.)
        const { error: projectsError } = await supabase
          .from('employee_projects')
          .delete()
          .eq('talent_profile_id', itemToDelete.id);
        
        if (projectsError) {
          console.warn('Error deleting employee projects:', projectsError);
        }

        const { error: skillsError } = await supabase
          .from('talent_skills')
          .delete()
          .eq('talent_profile_id', itemToDelete.id);
        
        if (skillsError) {
          console.warn('Error deleting talent skills:', skillsError);
        }

        // Then delete the talent profile
        const { data: deleteData, error: talentError } = await supabase
          .from('talent_profiles')
          .delete()
          .eq('id', itemToDelete.id)
          .select();

        console.log('Talent delete result:', { deleteData, talentError });

        if (talentError) {
          console.error('Error deleting talent profile:', talentError);
          throw new Error(`Failed to delete talent profile: ${talentError.message}`);
        }
        
        if (!deleteData || deleteData.length === 0) {
          throw new Error('No records were deleted - you may not have permission to delete this talent profile or it may not exist');
        }
        
        console.log('Talent profile deleted successfully:', deleteData);
        
        // Refresh talents list
        await fetchTalents();
        await fetchStats();
        
        // Dispatch custom event for talent tab to refresh
        window.dispatchEvent(new CustomEvent('talentDeleted'));
      } else if (itemToDelete.type === 'opportunity') {
        console.log('Deleting opportunity:', itemToDelete.id);
        
        // Check if opportunity exists
        const { data: existingOpportunity, error: checkError } = await supabase
          .from('opportunities')
          .select('id')
          .eq('id', itemToDelete.id)
          .single();
        
        if (checkError || !existingOpportunity) {
          throw new Error('Opportunity not found or access denied');
        }
        
        // First delete related assignments
        const { error: assignmentsError } = await supabase
          .from('assignments')
          .delete()
          .eq('opportunity_id', itemToDelete.id);
        
        if (assignmentsError) {
          console.warn('Error deleting assignments:', assignmentsError);
        }
        
        // Then delete the opportunity
        const { data: deleteData, error: opportunityError } = await supabase
          .from('opportunities')
          .delete()
          .eq('id', itemToDelete.id)
          .select();

        console.log('Opportunity delete result:', { deleteData, opportunityError });

        if (opportunityError) {
          console.error('Error deleting opportunity:', opportunityError);
          throw new Error(`Failed to delete opportunity: ${opportunityError.message}`);
        }
        
        if (!deleteData || deleteData.length === 0) {
          throw new Error('No records were deleted - you may not have permission to delete this opportunity or it may not exist');
        }
        
        console.log('Opportunity deleted successfully:', deleteData);
        
        // Refresh opportunities list
        await fetchStats();
        
        // Dispatch custom event for opportunity tab to refresh
        window.dispatchEvent(new CustomEvent('opportunityDeleted'));
      }

      // Only show success toast if we reach here (no errors thrown)
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      
      toast({
        title: "Success",
        description: `${itemToDelete.type === 'talent' ? 'Talent profile' : 'Opportunity'} deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: `Failed to delete ${itemToDelete?.type === 'talent' ? 'talent profile' : 'opportunity'}. ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const fetchTalents = async () => {
    console.log('🎯 TalentPool fetchTalents called!');
    try {
      // Get talent profiles directly (now contains email and avatar_url)
      const { data: talentData, error: talentError } = await supabase
        .from('talent_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('Raw talent data from TalentPool:', talentData);

      if (talentError) throw talentError;

      // Get skills and projects for each talent
      const talentsWithSkills = await Promise.all(
        (talentData || []).map(async (talent) => {
          // Get skills
          const { data: skills, error: skillsError } = await supabase
            .from('talent_skills')
            .select(`
              skill_id,
              proficiency_level,
              skills (name)
            `)
            .eq('talent_profile_id', talent.id);

          // Get projects (only for existing employees)
          let projects = [];
          if (talent.talent_type === 'existing') {
            const { data: projectsData, error: projectsError } = await supabase
              .from('employee_projects')
              .select('id, project_name, reporting_manager, utilization_percentage, release_date')
              .eq('talent_profile_id', talent.id)
              .order('created_at', { ascending: false });
            
            projects = projectsData || [];
          }

          const processedTalent = {
            ...talent,
            profiles: { 
              first_name: talent.first_name || '', 
              last_name: talent.last_name || '', 
              email: talent.email 
            },
            talent_skills: skills || [],
            employee_projects: projects
          };
          console.log('Processing talent:', talent.first_name, talent.last_name, '→', processedTalent.profiles, 'Projects:', projects.length);
          return processedTalent;
        })
      );

      setTalents(talentsWithSkills);
    } catch (error) {
      console.error('Error fetching talents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get talent counts by type and prospect status
      const { data: talentStats, error: talentError } = await supabase
        .from('talent_profiles')
        .select('id, talent_type, prospect_status');
      
      // Get opportunities count
      const { data: opportunities, error: oppsError } = await supabase
        .from('opportunities')
        .select('status')
        .eq('status', 'open');

      // Get employees with release dates in next 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: rollingOffData, error: rollingOffError } = await supabase
        .from('employee_projects')
        .select(`
          id,
          release_date,
          talent_profiles!inner(
            id,
            talent_type
          )
        `)
        .not('release_date', 'is', null)
        .lte('release_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .eq('talent_profiles.talent_type', 'existing');

      if (talentError || oppsError || rollingOffError) throw talentError || oppsError || rollingOffError;

      // Calculate available talent using new logic
      // For prospects: available if prospect_status is 'available' or null
      const availableProspects = talentStats?.filter(t => t.talent_type === 'prospect' && (t.prospect_status === 'available' || !t.prospect_status)).length || 0;
      
      // For existing employees: need to check utilization from employee_projects
      // First, get utilization data for existing employees
      const { data: existingUtilizationData, error: existingUtilError } = await supabase
        .from('employee_projects')
        .select('talent_profile_id, utilization_percentage');
      
      if (existingUtilError) throw existingUtilError;
      
      // Group utilization by talent_profile_id
      const utilizationByTalent = (existingUtilizationData || []).reduce((acc, project) => {
        if (!acc[project.talent_profile_id]) {
          acc[project.talent_profile_id] = 0;
        }
        acc[project.talent_profile_id] += project.utilization_percentage || 0;
        return acc;
      }, {} as Record<string, number>);
      
      // Count existing employees with utilization < 100%
      const availableExisting = talentStats?.filter(t => {
        if (t.talent_type !== 'existing') return false;
        const totalUtilization = utilizationByTalent[t.id] || 0;
        return totalUtilization < 100;
      }).length || 0;
      
      const available = availableExisting + availableProspects;
      
      const total = talentStats?.length || 1;
      
      // Count unique employees (not projects) rolling off
      const uniqueRollingOffEmployees = new Set(rollingOffData?.map(item => item.talent_profiles.id) || []).size;
      
      // Calculate actual utilization from employee projects
      const { data: utilizationData, error: utilError } = await supabase
        .from('employee_projects')
        .select('utilization_percentage, talent_profiles!inner(talent_type)')
        .eq('talent_profiles.talent_type', 'existing');

      let actualUtilization = 0;
      if (utilizationData && utilizationData.length > 0) {
        const totalUtilization = utilizationData.reduce((sum, project) => sum + (project.utilization_percentage || 0), 0);
        actualUtilization = Math.round(totalUtilization / utilizationData.length);
      }
      
      setStats({
        available,
        rollingOff: uniqueRollingOffEmployees,
        openRoles: opportunities?.length || 0,
        utilization: actualUtilization
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      // Fetch talent analytics with employee_projects for utilization calculation
      const { data: talentData, error: talentError } = await supabase
        .from('talent_profiles')
        .select(`
          talent_role, 
          location, 
          talent_type, 
          created_at, 
          skills, 
          prospect_status,
          employee_projects (
            utilization_percentage
          )
        `);

      // Fetch opportunity analytics
      const { data: opportunityData, error: oppError } = await supabase
        .from('opportunities')
        .select('status, required_role, created_at');

      if (talentError || oppError) throw talentError || oppError;

      // Process talent by role
      const talentByRole = talentData?.reduce((acc, talent) => {
        const role = talent.talent_role || 'Unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Helper function to calculate total utilization
      const getTotalUtilizationFromData = (projects: any[] = []) => {
        return Math.min(projects.reduce((total, project) => total + (project.utilization_percentage || 0), 0), 100);
      };

      // Process talent by status using new logic
      const talentByStatus = talentData?.reduce((acc, talent) => {
        if (talent.talent_type === 'prospect') {
          const status = talent.prospect_status || 'available';
          acc[status] = (acc[status] || 0) + 1;
        } else {
          const utilization = getTotalUtilizationFromData(talent.employee_projects);
          if (utilization < 100) {
            acc['available'] = (acc['available'] || 0) + 1;
          } else if (utilization === 100) {
            acc['occupied'] = (acc['occupied'] || 0) + 1;
          }
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Process existing employees by utilization status
      const existingByStatus = talentData?.filter(t => t.talent_type === 'existing').reduce((acc, talent) => {
        const utilization = getTotalUtilizationFromData(talent.employee_projects);
        
        if (utilization < 100) {
          acc['available'] = (acc['available'] || 0) + 1;
        } else if (utilization === 100) {
          acc['occupied'] = (acc['occupied'] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>) || {};

      // Process prospects by prospect_status
      const prospectsByStatus = talentData?.filter(t => t.talent_type === 'prospect').reduce((acc, talent) => {
        const status = talent.prospect_status || 'available';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Ensure all prospect statuses are included even if count is 0
      const allProspectStatuses = ['available', 'interviewing', 'rejected', 'inactive'];
      allProspectStatuses.forEach(status => {
        if (!prospectsByStatus[status]) {
          prospectsByStatus[status] = 0;
        }
      });

      // Debug logging
      console.log('Total talents from main list:', talents.length);
      console.log('Existing employees:', talents.filter(t => t.talent_type === 'existing').length);
      console.log('Prospects:', talents.filter(t => t.talent_type === 'prospect').length);
      console.log('Existing by status:', existingByStatus);
      console.log('Prospects by status:', prospectsByStatus);

      // Process talent by location
      const talentByLocation = talentData?.reduce((acc, talent) => {
        const location = talent.location || 'Remote';
        acc[location] = (acc[location] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Process opportunities by status
      const opportunitiesByStatus = opportunityData?.reduce((acc, opp) => {
        const status = opp.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Process opportunities by role
      const opportunitiesByRole = opportunityData?.reduce((acc, opp) => {
        const role = opp.required_role || 'Unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Process monthly hires (last 6 months)
      const monthlyHires = talentData?.reduce((acc, talent) => {
        const date = new Date(talent.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        acc[monthKey] = (acc[monthKey] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Process top skills
      const skillCounts: Record<string, number> = {};
      talentData?.forEach(talent => {
        if (talent.skills && Array.isArray(talent.skills)) {
          talent.skills.forEach(skill => {
            skillCounts[skill] = (skillCounts[skill] || 0) + 1;
          });
        }
      });

      const topSkills = Object.entries(skillCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      setAnalytics({
        talentByRole: Object.entries(talentByRole).map(([role, count]) => ({ role, count })),
        talentByStatus: Object.entries(talentByStatus).map(([status, count]) => ({ status, count })),
        talentByLocation: Object.entries(talentByLocation).map(([location, count]) => ({ location, count })),
        opportunitiesByStatus: Object.entries(opportunitiesByStatus).map(([status, count]) => ({ status, count })),
        opportunitiesByRole: Object.entries(opportunitiesByRole).map(([role, count]) => ({ role, count })),
        utilizationTrends: [], // Placeholder for future implementation
        monthlyHires: Object.entries(monthlyHires).map(([month, count]) => ({ month, count })),
        topSkills,
        existingByStatus: Object.entries(existingByStatus).map(([status, count]) => ({ status, count })),
        prospectsByStatus: Object.entries(prospectsByStatus).map(([status, count]) => ({ status, count }))
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const getStatusColor = (status: string, utilization: number = 0) => {
    if (utilization === 100) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'assigned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'bench': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'on_project': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'unavailable': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'assigned': return 'Deployed';
      case 'bench': return 'Bench';
      case 'on_project': return 'On Project';
      case 'unavailable': return 'Unavailable';
      default: return 'Inactive';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'engineer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'designer': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'pm': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'qa': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'data_scientist': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'pm': return 'PM';
      case 'qa': return 'QA';
      case 'data_scientist': return 'Data';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const getTotalUtilization = (projects: Array<{utilization_percentage: number}> = []) => {
    return Math.min(projects.reduce((total, project) => total + project.utilization_percentage, 0), 100);
  };

  const toggleCardFlip = (cardId: string) => {
    const newFlippedCards = new Set(flippedCards);
    if (newFlippedCards.has(cardId)) {
      newFlippedCards.delete(cardId);
    } else {
      newFlippedCards.add(cardId);
    }
    setFlippedCards(newFlippedCards);
  };

  const renderPieChart = (data: Array<{status: string, count: number}>, colors: string[]) => {
    const total = data.reduce((sum, item) => sum + item.count, 0);
    if (total === 0) return <div className="text-center text-muted-foreground">No data</div>;
    
    let cumulativePercentage = 0;
    return (
      <div className="relative w-32 h-32 mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {data.map((item, index) => {
            const percentage = (item.count / total) * 100;
            const startAngle = (cumulativePercentage / 100) * 360;
            const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
            cumulativePercentage += percentage;
            
            const startAngleRad = (startAngle - 90) * (Math.PI / 180);
            const endAngleRad = (endAngle - 90) * (Math.PI / 180);
            
            const largeArcFlag = percentage > 50 ? 1 : 0;
            const x1 = 50 + 40 * Math.cos(startAngleRad);
            const y1 = 50 + 40 * Math.sin(startAngleRad);
            const x2 = 50 + 40 * Math.cos(endAngleRad);
            const y2 = 50 + 40 * Math.sin(endAngleRad);
            
            const pathData = [
              `M 50 50`,
              `L ${x1} ${y1}`,
              `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            return (
              <path
                key={index}
                d={pathData}
                fill={colors[index % colors.length]}
                stroke="white"
                strokeWidth="1"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{total}</span>
        </div>
      </div>
    );
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'employee_referral': return 'Employee Referral';
      case 'direct_application': return 'Direct Application';
      case 'active_sourcing': return 'Active Sourcing';
      case 'linkedin_outreach': return 'LinkedIn Outreach';
      case 'job_board': return 'Job Board';
      case 'university_recruiting': return 'University Recruiting';
      case 'industry_event': return 'Industry Event';
      default: return 'Unknown Source';
    }
  };

  const getAvailabilityLabel = (availabilityDate: string) => {
    if (!availabilityDate) return 'Immediate';
    
    const today = new Date();
    const startDate = new Date(availabilityDate);
    
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate <= today) {
      return 'Immediate';
    }
    
    return startDate.toLocaleDateString();
  };

  const getProspectStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'interviewing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getProspectStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'interviewing': return 'In Selection Process';
      case 'rejected': return 'Rejected';
      case 'inactive': return 'Inactive';
      default: return 'Available';
    }
  };

  const filteredTalents = talents.filter(talent => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      (talent.profiles.first_name && talent.profiles.first_name.toLowerCase().includes(searchLower)) ||
      (talent.profiles.last_name && talent.profiles.last_name.toLowerCase().includes(searchLower)) ||
      talent.talent_role.toLowerCase().includes(searchLower) ||
      (talent.skills && talent.skills.some(skill => skill.toLowerCase().includes(searchLower))) ||
      talent.talent_skills.some(skill => skill.skills.name.toLowerCase().includes(searchLower));
    
    const matchesRole = selectedRole === 'all' || talent.talent_role === selectedRole;
    
    const matchesTalentType = selectedTab === 'all' || talent.talent_type === selectedTab;
    
    // Apply advanced filters
    const matchesFilterTalentType = filters.talentType === 'all' || talent.talent_type === filters.talentType;
    
    let matchesFilterStatus = true;
    if (filters.status !== 'all') {
      if (talent.talent_type === 'prospect') {
        matchesFilterStatus = (talent.prospect_status || 'available') === filters.status;
      } else {
        const utilization = getTotalUtilization(talent.employee_projects);
        if (filters.status === 'occupied') {
          matchesFilterStatus = utilization === 100;
        } else if (filters.status === 'available') {
          // For existing employees, "available" means utilization < 100%
          matchesFilterStatus = utilization < 100;
        }
      }
    }
    
    const matchesFilterRole = filters.role === 'all' || talent.talent_role === filters.role;
    
    const matchesFilterLocation = filters.location === 'all' || 
      (talent.location && talent.location.toLowerCase().includes(filters.location.toLowerCase()));
    
    return matchesSearch && matchesRole && matchesTalentType && 
           matchesFilterTalentType && matchesFilterStatus && matchesFilterRole && matchesFilterLocation;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Talent Management</h1>
              <p className="text-muted-foreground">Manage your talent pool, opportunities, and analytics</p>
          </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex flex-col space-y-2">
                <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                <div className="text-sm text-muted-foreground">Available Talent</div>
                <div className="text-xs text-green-600">Ready for assignment</div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex flex-col space-y-2">
                <div className="text-2xl font-bold text-amber-600">{stats.rollingOff}</div>
                <div className="text-sm text-muted-foreground">Rolling Off</div>
                <div className="text-xs text-amber-600">Next 30 days</div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex flex-col space-y-2">
                <div className="text-2xl font-bold text-blue-600">{stats.openRoles}</div>
                <div className="text-sm text-muted-foreground">Open Roles</div>
                <div className="text-xs text-blue-600">Awaiting matches</div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex flex-col space-y-2">
                <div className="text-2xl font-bold text-purple-600">{stats.utilization}%</div>
                <div className="text-sm text-muted-foreground">Utilization</div>
                <div className="text-xs text-purple-600">Overall capacity</div>
              </div>
            </Card>
          </motion.div>
        </div>


        {/* Tabs */}
        <Tabs defaultValue="talent" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="talent" className="flex items-center space-x-2">
              <span>Talent</span>
            </TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="talent" className="space-y-6">
            {/* Talent Tab Header */}
            <div className="flex items-center justify-between">
              {/* Sub-tabs */}
              <div className="flex items-center space-x-1 bg-muted/50 p-1 rounded-lg w-fit">
                <button
                  onClick={() => setSelectedTab('all')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedTab === 'all'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All Talent
                </button>
                <button
                  onClick={() => setSelectedTab('existing')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedTab === 'existing'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Existing Employees
                </button>
                <button
                  onClick={() => setSelectedTab('prospect')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    selectedTab === 'prospect'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  New Prospects
                </button>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by name, skills, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
                
                <Button variant="outline" size="sm" onClick={() => setIsFilterDialogOpen(true)}>
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
                <Button onClick={() => navigate('/add-talent')} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Talent
                </Button>
              </div>
            </div>

            {/* Role Filters */}
            <div className="flex flex-wrap gap-2">
              <Badge 
                variant={selectedRole === 'all' ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => setSelectedRole('all')}
              >
                All
              </Badge>
              <Badge 
                variant={selectedRole === 'engineer' ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => setSelectedRole('engineer')}
              >
                Engineer
              </Badge>
              <Badge 
                variant={selectedRole === 'designer' ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => setSelectedRole('designer')}
              >
                Designer
              </Badge>
              <Badge 
                variant={selectedRole === 'product_manager' ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => setSelectedRole('product_manager')}
              >
                PM
              </Badge>
              <Badge 
                variant={selectedRole === 'data_scientist' ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={() => setSelectedRole('data_scientist')}
              >
                Data
              </Badge>
            </div>

            {/* Talent Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTalents.map((talent, index) => (
                <motion.div
                  key={talent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                   <Card 
                     className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col"
                     onClick={() => {
                       navigate(`/talent-profile/${talent.id}`);
                     }}
                   >
                    <div className="flex items-start mb-4">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                         <Avatar className="h-12 w-12 flex-shrink-0">
                           <AvatarImage src={talent.avatar_url} />
                           <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                             {(talent.profiles.first_name || '').charAt(0)}{(talent.profiles.last_name || '').charAt(0)}
                           </AvatarFallback>
                         </Avatar>
                        <div className="min-w-0 flex-1 max-w-[calc(100%-4rem)]">
                          <h3 className="font-semibold text-foreground truncate">
                            {talent.profiles.first_name || 'Unknown'} {talent.profiles.last_name || 'User'}
                          </h3>
                          <div className="flex items-center flex-wrap gap-1">
                            <Badge className={`${getRoleColor(talent.talent_role)} hover:bg-white hover:text-black transition-colors flex-shrink-0 text-xs px-3 py-1`}>
                              {getRoleLabel(talent.talent_role)}
                            </Badge>
                            <Badge 
                              className={`text-xs px-3 py-1 whitespace-nowrap hover:bg-white hover:text-black transition-colors flex-shrink-0 ${
                                talent.talent_type === 'existing' 
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                                  : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              }`}
                            >
                              {talent.talent_type === 'existing' ? 'Tech9 Employee' : 'New Prospect'}
                            </Badge>
                            {talent.talent_type === 'prospect' ? (
                              <Badge className={`${getProspectStatusColor(talent.prospect_status || 'available')} hover:bg-white hover:text-black transition-colors flex-shrink-0 text-xs px-3 py-1 whitespace-nowrap`}>
                                {getProspectStatusLabel(talent.prospect_status || 'available')}
                              </Badge>
                            ) : (
                              <Badge className={`${getTotalUtilization(talent.employee_projects) === 100 ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'} hover:bg-white hover:text-black transition-colors flex-shrink-0 text-xs px-3 py-1 whitespace-nowrap`}>
                                {getTotalUtilization(talent.employee_projects) === 100 ? 'Occupied' : 'Available'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={(e) => {
                            console.log('Talent delete button clicked for:', talent.id);
                            e.stopPropagation();
                            handleDeleteClick(
                              talent.id, 
                              'talent', 
                              `${talent.profiles.first_name || 'Unknown'} ${talent.profiles.last_name || 'User'}`
                            );
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3 flex-grow">
                      {/* Skills Pills */}
                      {talent.skills && talent.skills.length > 0 && (
                        <div>
                          <div className="flex flex-wrap gap-1">
                            {talent.skills.slice(0, 6).map((skill, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                {skill}
                              </Badge>
                            ))}
                            {talent.skills.length > 6 && (
                              <Badge variant="outline" className="text-xs">
                                +{talent.skills.length - 6} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{talent.location}</span>
                      </div>

                      {/* Utilization - only show for existing employees */}
                      {talent.talent_type === 'existing' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Utilization</span>
                            <span className="font-medium text-foreground">
                              {getTotalUtilization(talent.employee_projects)}%
                            </span>
                          </div>
                          <div 
                            className="w-full bg-muted rounded-full h-2 cursor-pointer group relative"
                            title={talent.employee_projects?.length ? 
                              talent.employee_projects.map(project => 
                                `${project.project_name} (${project.utilization_percentage}%) - ${project.reporting_manager}${project.release_date ? ` - Release: ${new Date(project.release_date).toLocaleDateString()}` : ''}`
                              ).join('\n') : 
                              'No projects assigned'
                            }
                          >
                            <div 
                              className="h-2 rounded-full bg-blue-500 transition-all duration-200"
                              style={{ width: `${getTotalUtilization(talent.employee_projects)}%` }}
                            />
                            {/* Tooltip */}
                            {talent.employee_projects?.length ? (
                              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-pre-line z-10 min-w-max">
                                <div className="font-semibold mb-1">Project Details:</div>
                                {talent.employee_projects.map((project, idx) => (
                                  <div key={idx} className="mb-1 last:mb-0">
                                    {project.project_name} ({project.utilization_percentage}%) - {project.reporting_manager}
                                    {project.release_date && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        Release: {new Date(project.release_date).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                <div className="border-t border-gray-700 mt-1 pt-1 font-semibold">
                                  Total: {getTotalUtilization(talent.employee_projects)}%
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        {/* Additional info for new prospects */}
                        {talent.talent_type === 'prospect' && (
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Available: {getAvailabilityLabel(talent.availability_start_date)}</span>
                            </div>
                            {talent.years_experience && talent.years_experience > 0 && (
                              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{talent.years_experience} years experience</span>
                              </div>
                            )}
                            {talent.source && (
                              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <span>{getSourceLabel(talent.source)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Utilization info for existing employees */}
                        {talent.talent_type === 'existing' && (
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>{getTotalUtilization(talent.employee_projects)}% Utilized</span>
                          </div>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:text-primary/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/talent-profile/${talent.id}`);
                          }}
                        >
                          View Profile →
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-6">
            <OpportunitiesTab 
              opportunityFilters={opportunityFilters} 
              setOpportunityFilters={setOpportunityFilters} 
              setIsOpportunityFilterDialogOpen={setIsOpportunityFilterDialogOpen}
              onDeleteClick={handleDeleteClick}
              refreshOpportunities={fetchStats}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {/* Dynamic Analytics Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Key Metrics */}
              <div className="space-y-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Total Talent</p>
                      <p className="text-3xl font-bold text-blue-900">{talents.length}</p>
                    </div>
                    <Users className="h-10 w-10 text-blue-600" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-100 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Available</p>
                      <p className="text-3xl font-bold text-green-900">
                        {(analytics.existingByStatus.find(s => s.status === 'available')?.count || 0) + (analytics.prospectsByStatus.find(s => s.status === 'available')?.count || 0)}
                      </p>
                    </div>
                    <UserCheck className="h-10 w-10 text-green-600" />
                  </div>
                </Card>
                
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Utilization</p>
                      <p className="text-3xl font-bold text-purple-900">{stats.utilization}%</p>
                    </div>
                    <Activity className="h-10 w-10 text-purple-600" />
                  </div>
                </Card>
              </div>

              {/* Center Column - Main Charts */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Talent by Role */}
              <Card 
                className="p-6 cursor-pointer transition-transform hover:scale-105" 
                onClick={() => toggleCardFlip('talentByRole')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Talent by Role</h3>
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                {flippedCards.has('talentByRole') ? (
                  <div className="text-center">
                    {renderPieChart(analytics.talentByRole, ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'])}
                    <div className="mt-4 space-y-2">
                      {analytics.talentByRole.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'][index % 5] }}
                            ></div>
                            <span className="capitalize">{item.role === 'qa' ? 'QA' : item.role}</span>
                          </div>
                          <span>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.talentByRole.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{item.role === 'qa' ? 'QA' : item.role}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(item.count / Math.max(...analytics.talentByRole.map(r => r.count))) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-8">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Talent by Status - Detailed */}
              <Card 
                className="p-6 cursor-pointer transition-transform hover:scale-105" 
                onClick={() => toggleCardFlip('talentByStatus')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Talent by Status</h3>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                {flippedCards.has('talentByStatus') ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Existing Employees Chart */}
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Existing Employees</h4>
                      {renderPieChart(analytics.existingByStatus, ['#10B981', '#3B82F6', '#EF4444', '#6B7280'])}
                      <div className="mt-3 space-y-1">
                        {analytics.existingByStatus.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: ['#10B981', '#3B82F6', '#EF4444', '#6B7280'][index % 4] }}
                              ></div>
                              <span className="capitalize">{item.status}</span>
                            </div>
                            <span>{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Prospects Chart */}
                    <div className="text-center">
                      <h4 className="text-sm font-medium text-muted-foreground mb-3">Prospects</h4>
                      {renderPieChart(analytics.prospectsByStatus.filter(item => item.count > 0), ['#10B981', '#F59E0B', '#EF4444', '#6B7280'])}
                      <div className="mt-3 space-y-1">
                        {analytics.prospectsByStatus.filter(item => item.count > 0).map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'][index % 4] }}
                              ></div>
                              <span className="capitalize">
                                {item.status === 'interviewing' ? 'Selection in Process' : 
                                 item.status === 'inactive' ? 'Inactive' :
                                 item.status}
                              </span>
                            </div>
                            <span>{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Existing Employees</h4>
                      <div className="space-y-2">
                        {analytics.existingByStatus.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                item.status === 'available' ? 'bg-green-500' :
                                item.status === 'assigned' ? 'bg-blue-500' :
                                item.status === 'occupied' ? 'bg-red-500' :
                                'bg-gray-500'
                              }`}></div>
                              <span className="capitalize">{item.status}</span>
                            </div>
                            <span>{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Prospects</h4>
                      <div className="space-y-2">
                        {analytics.prospectsByStatus.filter(item => item.count > 0).map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${
                                item.status === 'available' ? 'bg-green-500' :
                                item.status === 'interviewing' ? 'bg-yellow-500' :
                                item.status === 'rejected' ? 'bg-red-500' :
                                item.status === 'inactive' ? 'bg-gray-500' :
                                'bg-gray-500'
                              }`}></div>
                              <span className="capitalize">
                                {item.status === 'interviewing' ? 'Selection in Process' : 
                                 item.status === 'inactive' ? 'Inactive' :
                                 item.status}
                              </span>
                            </div>
                            <span>{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Opportunities by Status */}
              <Card 
                className="p-6 cursor-pointer transition-transform hover:scale-105" 
                onClick={() => toggleCardFlip('opportunitiesByStatus')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Opportunities by Status</h3>
                  <Target className="h-5 w-5 text-muted-foreground" />
                </div>
                {flippedCards.has('opportunitiesByStatus') ? (
                  <div className="text-center">
                    {renderPieChart(analytics.opportunitiesByStatus, ['#10B981', '#3B82F6', '#EF4444', '#F59E0B'])}
                    <div className="mt-4 space-y-2">
                      {analytics.opportunitiesByStatus.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: ['#10B981', '#3B82F6', '#EF4444', '#F59E0B'][index % 4] }}
                            ></div>
                            <span className="capitalize">{item.status}</span>
                          </div>
                          <span>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.opportunitiesByStatus.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${
                            item.status === 'open' ? 'bg-green-500' :
                            item.status === 'filled' ? 'bg-blue-500' :
                            item.status === 'cancelled' ? 'bg-red-500' :
                            'bg-yellow-500'
                          }`}></div>
                          <span className="text-sm font-medium capitalize">{item.status}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Top Skills */}
              <Card 
                className="p-6 cursor-pointer transition-transform hover:scale-105" 
                onClick={() => toggleCardFlip('topSkills')}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Top Skills</h3>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                {flippedCards.has('topSkills') ? (
                  <div className="text-center">
                    {renderPieChart(analytics.topSkills.slice(0, 5), ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'])}
                    <div className="mt-4 space-y-2">
                      {analytics.topSkills.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'][index % 5] }}
                            ></div>
                            <span>{item.skill}</span>
                          </div>
                          <span>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {analytics.topSkills.slice(0, 8).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.skill}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full" 
                              style={{ width: `${(item.count / Math.max(...analytics.topSkills.map(s => s.count))) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground w-6">{item.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
                </div>

                {/* Bottom Row - Additional Insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Location Distribution */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Talent by Location</h3>
                      <Globe className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {analytics.talentByLocation.map((item, index) => (
                        <div key={index} className="text-center p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">{item.location}</p>
                          <p className="text-lg font-bold text-primary">{item.count}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Monthly Hires Trend */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Monthly Hires</h3>
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="space-y-3">
                      {analytics.monthlyHires.slice(-4).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.month}</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full" 
                                style={{ width: `${(item.count / Math.max(...analytics.monthlyHires.map(h => h.count))) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-muted-foreground w-6">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Filter Dialog */}
        <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Filter Talents</DialogTitle>
              <DialogDescription>
                Filter talents by type, status, role, and location
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Talent Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Talent Type</label>
                <Select value={filters.talentType} onValueChange={(value) => setFilters(prev => ({ ...prev, talentType: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select talent type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="existing">Existing Employees</SelectItem>
                    <SelectItem value="prospect">New Prospects</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="occupied">Occupied (100% utilization)</SelectItem>
                    <SelectItem value="interviewing">In Selection Process</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={filters.role} onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="engineer">Engineer</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="pm">Product Manager</SelectItem>
                    <SelectItem value="qa">QA Engineer</SelectItem>
                    <SelectItem value="data_scientist">Data Scientist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
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
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setFilters({ talentType: 'all', status: 'all', role: 'all', location: 'all' })}
              >
                Clear All
              </Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsFilterDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsFilterDialogOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Opportunity Filter Dialog */}
        <Dialog open={isOpportunityFilterDialogOpen} onOpenChange={setIsOpportunityFilterDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Filter Opportunities</DialogTitle>
              <DialogDescription>
                Filter opportunities by status, role, location, and start date
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={opportunityFilters.status} onValueChange={(value) => setOpportunityFilters(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="filled">Filled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select value={opportunityFilters.role} onValueChange={(value) => setOpportunityFilters(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="engineer">Engineer</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="pm">Product Manager</SelectItem>
                    <SelectItem value="qa">QA Engineer</SelectItem>
                    <SelectItem value="data_scientist">Data Scientist</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Select value={opportunityFilters.location} onValueChange={(value) => setOpportunityFilters(prev => ({ ...prev, location: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
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
              </div>

              {/* Start Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date (From)</label>
                <Input
                  type="date"
                  value={opportunityFilters.startDate}
                  onChange={(e) => setOpportunityFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  placeholder="Select start date"
                />
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setOpportunityFilters({ status: 'all', role: 'all', location: 'all', startDate: '' })}
              >
                Clear All
              </Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setIsOpportunityFilterDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsOpportunityFilterDialogOpen(false)}>
                  Apply Filters
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {itemToDelete?.type === 'talent' ? 'talent profile' : 'opportunity'} "{itemToDelete?.name}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setItemToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TalentPool;