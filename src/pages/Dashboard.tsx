import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Briefcase, 
  TrendingUp, 
  Clock, 
  Plus,
  Brain,
  Search,
  BarChart3,
  UserPlus,
  Edit,
  Calendar,
  User,
  LogOut,
  Shield
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface Activity {
  id: string;
  type: 'talent_created' | 'opportunity_filled' | 'opportunity_created' | 'profile_updated' | 'opportunity_updated';
  title: string;
  description: string;
  time: string;
  timestamp: string;
  icon: any;
  color: string;
}

const Dashboard = () => {
  const { profile, roles, hasRole, signOut } = useAuth();
  const { isAdmin, isManager, isRegularUser, loading } = useUserRole();
  const navigate = useNavigate();
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24h');
  const [activeTab, setActiveTab] = useState('new-profiles');

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleViewProfile = () => {
    // Navigate to user dashboard for profile management
    console.log('Navigating to user dashboard...');
    console.log('User roles:', { isAdmin, isManager, isRegularUser, loading });
    navigate('/user-dashboard');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  const [stats, setStats] = useState([
    {
      title: 'Available Talent',
      value: '0',
      icon: Users,
      color: 'text-blue-600',
      changeColor: 'text-green-600'
    },
    {
      title: 'Open Opportunities',
      value: '0',
      icon: Briefcase,
      color: 'text-green-600',
      changeColor: 'text-green-600'
    }
  ]);

  const quickActions = [
    {
      title: 'Add New Talent',
      description: 'Onboard a new team member',
      icon: UserPlus,
      action: 'add-talent',
      color: 'bg-blue-50 text-blue-600 border-blue-200'
    },
    {
      title: 'Create Opportunity',
      description: 'Post a new project opportunity',
      icon: Plus,
      action: 'create-opportunity',
      color: 'bg-green-50 text-green-600 border-green-200'
    },
    {
      title: 'AI Matching',
      description: 'Run intelligent matching algorithm',
      icon: Brain,
      action: 'ai-match',
      color: 'bg-purple-50 text-purple-600 border-purple-200'
    },
    {
      title: 'Talent Management',
      description: 'Browse talent, opportunities & analytics',
      icon: BarChart3,
      action: 'talent-pool',
      color: 'bg-orange-50 text-orange-600 border-orange-200'
    }
  ];

  const fetchStats = async () => {
    try {
      // Get all talent profiles with their type and prospect status
      const { data: talentData, error: talentError } = await supabase
        .from('talent_profiles')
        .select('id, talent_type, prospect_status');
      
      // Get utilization data for existing employees
      const { data: utilizationData, error: utilError } = await supabase
        .from('employee_projects')
        .select('talent_profile_id, utilization_percentage');
      
      // Get open opportunities count
      const { data: opportunitiesData, error: oppError } = await supabase
        .from('opportunities')
        .select('id')
        .eq('status', 'open');

      if (talentError || utilError || oppError) throw talentError || utilError || oppError;

      // Calculate available talent using the same logic as TalentPool
      // For prospects: available if prospect_status is 'available' or null
      const availableProspects = talentData?.filter(t => t.talent_type === 'prospect' && (t.prospect_status === 'available' || !t.prospect_status)).length || 0;
      
      // For existing employees: need to check utilization from employee_projects
      // Group utilization by talent_profile_id
      const utilizationByTalent = (utilizationData || []).reduce((acc, project) => {
        if (!acc[project.talent_profile_id]) {
          acc[project.talent_profile_id] = 0;
        }
        acc[project.talent_profile_id] += project.utilization_percentage || 0;
        return acc;
      }, {} as Record<string, number>);
      
      // Count existing employees with utilization < 100%
      const availableExisting = talentData?.filter(t => {
        if (t.talent_type !== 'existing') return false;
        const totalUtilization = utilizationByTalent[t.id] || 0;
        return totalUtilization < 100;
      }).length || 0;
      
      const availableTalent = availableExisting + availableProspects;
      const openOpportunities = opportunitiesData?.length || 0;

      setStats([
        {
          title: 'Available Talent',
          value: availableTalent.toString(),
          icon: Users,
          color: 'text-blue-600',
          changeColor: 'text-green-600'
        },
        {
          title: 'Open Opportunities',
          value: openOpportunities.toString(),
          icon: Briefcase,
          color: 'text-green-600',
          changeColor: 'text-green-600'
        }
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const getTimeframeDate = (timeframe: string) => {
    const now = new Date();
    switch (timeframe) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setIsLoading(true);
      const activities: Activity[] = [];
      const timeframeDate = getTimeframeDate(timeframe);

      // 1. Recent talent profiles created
      const { data: recentTalents, error: talentError } = await supabase
        .from('talent_profiles')
        .select('id, first_name, last_name, talent_role, talent_type, prospect_status, created_at')
        .gte('created_at', timeframeDate.toISOString())
        .order('created_at', { ascending: false });

      if (!talentError && recentTalents) {
        for (const talent of recentTalents) {
          // Get utilization data for existing employees
          let utilization = null;
          if (talent.talent_type === 'existing') {
            const { data: utilizationData } = await supabase
              .from('employee_projects')
              .select('utilization_percentage')
              .eq('talent_profile_id', talent.id);
            
            if (utilizationData && utilizationData.length > 0) {
              utilization = utilizationData.reduce((sum, project) => sum + (project.utilization_percentage || 0), 0);
            }
          }

          const status = talent.talent_type === 'prospect' 
            ? (talent.prospect_status || 'Available')
            : (utilization !== null ? `${utilization}% utilized` : 'Active');

          activities.push({
            id: `talent-${talent.id}`,
            type: 'talent_created',
            title: `${talent.first_name} ${talent.last_name}`,
            description: `${talent.talent_role} • ${talent.talent_type} • ${status}`,
            time: getTimeAgo(talent.created_at),
            timestamp: talent.created_at,
            icon: Users,
            color: 'text-blue-600'
          });
        }
      }

      // 2. Recent opportunities filled (temporarily disabled until migration is run)
      // const { data: filledOpportunities, error: oppError } = await supabase
      //   .from('opportunities')
      //   .select('id, title, required_role, fulfilled_at')
      //   .not('fulfilled_at', 'is', null)
      //   .gte('fulfilled_at', timeframeDate.toISOString())
      //   .order('fulfilled_at', { ascending: false });

      // if (!oppError && filledOpportunities) {
      //   filledOpportunities.forEach(opportunity => {
      //     activities.push({
      //       id: `opp-filled-${opportunity.id}`,
      //       type: 'opportunity_filled',
      //       title: 'Opportunity filled',
      //       description: `${opportunity.title} - ${opportunity.required_role}`,
      //       time: getTimeAgo(opportunity.fulfilled_at),
      //       timestamp: opportunity.fulfilled_at,
      //       icon: Briefcase,
      //       color: 'text-green-600'
      //     });
      //   });
      // }

      // 3. Recent opportunities created
      const { data: newOpportunities, error: newOppError } = await supabase
        .from('opportunities')
        .select('id, title, required_role, status, created_at')
        .gte('created_at', timeframeDate.toISOString())
        .order('created_at', { ascending: false });

      if (!newOppError && newOpportunities) {
        newOpportunities.forEach(opportunity => {
          activities.push({
            id: `opp-created-${opportunity.id}`,
            type: 'opportunity_created',
            title: opportunity.title,
            description: `${opportunity.required_role} • ${opportunity.status}`,
            time: getTimeAgo(opportunity.created_at),
            timestamp: opportunity.created_at,
            icon: Plus,
            color: 'text-blue-600'
          });
        });
      }

      // 4. Recent profile updates - check for profiles updated within timeframe
      const { data: updatedTalents, error: updateError } = await supabase
        .from('talent_profiles')
        .select('id, first_name, last_name, talent_role, talent_type, prospect_status, created_at, updated_at')
        .not('updated_at', 'is', null)
        .gte('updated_at', timeframeDate.toISOString())
        .order('updated_at', { ascending: false });

      console.log('Profile updates query:', { 
        updatedTalents, 
        updateError, 
        timeframeDate: timeframeDate.toISOString(),
        count: updatedTalents?.length || 0
      });
      
      // Debug: Show the actual profile data
      if (updatedTalents) {
        console.log('Profile update details:');
        updatedTalents.forEach((talent, index) => {
          console.log(`${index + 1}. ${talent.first_name} ${talent.last_name} - created: ${talent.created_at}, updated: ${talent.updated_at}`);
        });
      }

      if (!updateError && updatedTalents) {
        console.log('Processing profile updates:', updatedTalents.length);
        for (const talent of updatedTalents) {
          // Only check if an update activity already exists, not if a created activity exists
          const updateAlreadyExists = activities.some(activity => activity.id === `update-${talent.id}`);
          const wasCreatedInTimeframe = activities.some(activity => activity.id === `talent-${talent.id}`);
          
          console.log(`Profile ${talent.id}: update exists = ${updateAlreadyExists}, created in timeframe = ${wasCreatedInTimeframe}`);
          
          // Add update activity if no update activity exists yet
          const updateTime = talent.updated_at;
          
          if (!updateAlreadyExists) {
            // Get utilization data for existing employees
            let utilization = null;
            if (talent.talent_type === 'existing') {
              const { data: utilizationData } = await supabase
                .from('employee_projects')
                .select('utilization_percentage')
                .eq('talent_profile_id', talent.id);
              
              if (utilizationData && utilizationData.length > 0) {
                utilization = utilizationData.reduce((sum, project) => sum + (project.utilization_percentage || 0), 0);
              }
            }

            const status = talent.talent_type === 'prospect' 
              ? (talent.prospect_status || 'Available')
              : (utilization !== null ? `${utilization}% utilized` : 'Active');

            const newActivity = {
              id: `update-${talent.id}`,
              type: 'profile_updated' as const,
              title: `${talent.first_name} ${talent.last_name}`,
              description: `${talent.talent_role} • ${talent.talent_type} • ${status}`,
              time: getTimeAgo(updateTime),
              timestamp: updateTime,
              icon: Edit,
              color: 'text-orange-600'
            };
            console.log('Adding profile update activity:', newActivity);
            activities.push(newActivity);
          }
        }
      }

      // 5. Recent opportunity updates - check for opportunities updated within timeframe
      const { data: updatedOpportunities, error: oppUpdateError } = await supabase
        .from('opportunities')
        .select('id, title, required_role, status, created_at, updated_at')
        .not('updated_at', 'is', null)
        .gte('updated_at', timeframeDate.toISOString())
        .order('updated_at', { ascending: false });

      console.log('Opportunity updates query:', { 
        updatedOpportunities, 
        oppUpdateError, 
        timeframeDate: timeframeDate.toISOString(),
        count: updatedOpportunities?.length || 0
      });
      
      // Debug: Show the actual opportunity data
      if (updatedOpportunities) {
        console.log('Opportunity update details:');
        updatedOpportunities.forEach((opp, index) => {
          console.log(`${index + 1}. ${opp.title} - created: ${opp.created_at}, updated: ${opp.updated_at}`);
        });
      }

      if (!oppUpdateError && updatedOpportunities) {
        console.log('Processing opportunity updates:', updatedOpportunities.length);
        updatedOpportunities.forEach(opportunity => {
          // Only check if an update activity already exists, not if a created activity exists
          const updateAlreadyExists = activities.some(activity => activity.id === `opp-update-${opportunity.id}`);
          const wasCreatedInTimeframe = activities.some(activity => activity.id === `opp-created-${opportunity.id}`);
          
          console.log(`Opportunity ${opportunity.id}: update exists = ${updateAlreadyExists}, created in timeframe = ${wasCreatedInTimeframe}`);
          
          // Add update activity if no update activity exists yet
          const updateTime = opportunity.updated_at;
          
          if (!updateAlreadyExists) {
            const newActivity = {
              id: `opp-update-${opportunity.id}`,
              type: 'opportunity_updated' as const,
              title: opportunity.title,
              description: `${opportunity.required_role} • ${opportunity.status}`,
              time: getTimeAgo(updateTime),
              timestamp: updateTime,
              icon: Edit,
              color: 'text-orange-600'
            };
            console.log('Adding opportunity update activity:', newActivity);
            activities.push(newActivity);
          }
        });
      }

      // Debug: Check if we have any updates
      console.log('Update check:', {
        hasProfileUpdates: updatedTalents && updatedTalents.length > 0,
        hasOpportunityUpdates: updatedOpportunities && updatedOpportunities.length > 0,
        profileCount: updatedTalents?.length || 0,
        opportunityCount: updatedOpportunities?.length || 0
      });

      // Debug: Check all records to see if updated_at is working
      const { data: allTalentsDebug } = await supabase
        .from('talent_profiles')
        .select('id, first_name, last_name, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(3);
      
      const { data: allOppsDebug } = await supabase
        .from('opportunities')
        .select('id, title, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(3);

      console.log('Debug - All talents (recent):', allTalentsDebug);
      console.log('Debug - All opportunities (recent):', allOppsDebug);

      // Sort activities by timestamp (most recent first)
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      console.log('All activities:', activities);
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRecentActivity();
  }, [timeframe]);

  const getFilteredActivities = (tab: string) => {
    const filtered = recentActivity.filter(activity => {
      switch (tab) {
        case 'new-profiles':
          return activity.type === 'talent_created';
        case 'profile-updates':
          return activity.type === 'profile_updated';
        case 'new-opportunities':
          return activity.type === 'opportunity_created';
        case 'opportunity-updates':
          return activity.type === 'opportunity_updated';
        default:
          return true;
      }
    });
    
    console.log(`Filtered activities for ${tab}:`, filtered);
    return filtered;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Welcome back, {profile?.first_name || 'User'}!
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Here's what's happening with your talent management today.
                </p>
              </div>
            <div className="flex items-center space-x-4">
              {/* User Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.first_name || 'User'} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {profile?.first_name && profile?.last_name 
                          ? getInitials(`${profile.first_name} ${profile.last_name}`)
                          : <User className="h-4 w-4" />
                        }
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex flex-col space-y-1 p-2">
                    <p className="text-sm font-medium leading-none">
                      {profile?.first_name} {profile?.last_name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer"
                    onClick={handleViewProfile}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>My Dashboard</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="cursor-pointer"
                        onClick={() => navigate('/admin')}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-red-600 focus:text-red-600"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className={`text-xs font-medium ${stat.changeColor}`}>Active</p>
                    </div>
                    <div className={`p-3 rounded-full bg-background ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Quick Actions</span>
              </CardTitle>
              <CardDescription>
                Common tasks to manage your talent pipeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.action}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Button
                      variant="outline"
                      className={`h-auto p-4 w-full flex flex-col items-center space-y-3 ${action.color} hover:shadow-md transition-all`}
                      data-walkthrough={
                        action.action === 'talent-pool' ? 'talent-pool-section' :
                        action.action === 'ai-match' ? 'ai-matching-section' :
                        action.action === 'create-opportunity' ? 'opportunities-section' :
                        action.action === 'add-talent' ? 'add-talent-section' : undefined
                      }
                      onClick={() => {
                        const routeMap = {
                          'add-talent': '/add-talent',
                          'create-opportunity': '/create-opportunity',
                          'ai-match': '/ai-matching',
                          'talent-pool': '/talent-pool'
                        };
                        navigate(routeMap[action.action as keyof typeof routeMap] || '/');
                      }}
                    >
                      <action.icon className="h-8 w-8" />
                      <div className="text-center">
                        <p className="font-semibold text-sm">{action.title}</p>
                        <p className="text-xs opacity-70">{action.description}</p>
                      </div>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest updates from your talent management system
                  </CardDescription>
                </div>
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="week">Past week</SelectItem>
                    <SelectItem value="month">Past month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="new-profiles">New Profiles</TabsTrigger>
                  <TabsTrigger value="profile-updates">Profile Updates</TabsTrigger>
                  <TabsTrigger value="new-opportunities">New Opportunities</TabsTrigger>
                  <TabsTrigger value="opportunity-updates">Opportunity Updates</TabsTrigger>
                </TabsList>
                
                <TabsContent value={activeTab} className="mt-6">
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((index) => (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-border animate-pulse">
                          <div className="p-2 rounded-full bg-gray-200 w-8 h-8"></div>
                          <div className="flex-1 min-w-0">
                            <div className="h-4 bg-gray-200 rounded mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded mb-2 w-3/4"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getFilteredActivities(activeTab).length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No activities found for the selected timeframe</p>
                        </div>
                      ) : (
                        getFilteredActivities(activeTab).map((activity, index) => (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="group flex items-start space-x-3 p-3 rounded-lg border border-border hover:shadow-sm transition-all duration-200 cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              // Navigate based on activity type
                              if (activity.type === 'talent_created' || activity.type === 'profile_updated') {
                                // Extract talent ID from activity ID
                                const talentId = activity.id.replace('talent-', '').replace('update-', '');
                                navigate(`/talent-profile/${talentId}`);
                              } else if (activity.type === 'opportunity_created' || activity.type === 'opportunity_updated') {
                                // Extract opportunity ID from activity ID
                                const oppId = activity.id.replace('opp-created-', '').replace('opp-update-', '');
                                navigate(`/opportunity/${oppId}`);
                              }
                            }}
                          >
                            <div className={`
                              p-2 rounded-full flex-shrink-0
                              ${activity.type === 'talent_created' ? 'bg-blue-50 text-blue-600' : ''}
                              ${activity.type === 'opportunity_filled' ? 'bg-green-50 text-green-600' : ''}
                              ${activity.type === 'opportunity_created' ? 'bg-blue-50 text-blue-600' : ''}
                              ${activity.type === 'profile_updated' ? 'bg-orange-50 text-orange-600' : ''}
                              ${activity.type === 'opportunity_updated' ? 'bg-orange-50 text-orange-600' : ''}
                            `}>
                              <activity.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground mb-1 leading-tight hover:text-primary transition-colors">
                                {activity.title}
                              </p>
                              <p className="text-sm text-muted-foreground mb-2 leading-tight">
                                {activity.description}
                              </p>
                              <p className="text-xs text-muted-foreground/80 font-medium">
                                {activity.time}
                              </p>
                            </div>
                            <div className="flex-shrink-0 ml-2">
                              <div className="w-2 h-2 rounded-full bg-muted-foreground/20 group-hover:bg-primary/60 transition-colors"></div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;