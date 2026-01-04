import { useState, useEffect } from 'react';
import { Search, Filter, User, MapPin, Clock, DollarSign, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

import type { Database } from '@/integrations/supabase/types';

type TalentRole = Database['public']['Enums']['talent_role'];
type TalentStatus = Database['public']['Enums']['talent_status'];

interface TalentProfile {
  id: string;
  talent_role: TalentRole;
  bio: string | null;
  location: string | null;
  years_experience: number | null;
  hourly_rate: number | null;
  remote_preference: boolean | null;
  status: TalentStatus;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  email: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

const SearchTalent = () => {
  console.log('🎯 SearchTalent component rendered!');
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<TalentRole | ''>('');
  const [locationFilter, setLocationFilter] = useState('');
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('🚀 useEffect triggered - calling fetchTalents');
    fetchTalents();
  }, [searchTerm, roleFilter, locationFilter]);

  const fetchTalents = async () => {
    console.log('🔍 fetchTalents function called!');
    setIsLoading(true);
    try {
      let query = supabase
        .from('talent_profiles')
        .select(`
          id,
          first_name,
          last_name,
          talent_role,
          bio,
          location,
          years_experience,
          remote_preference,
          talent_type,
          prospect_status,
          linkedin_url,
          github_url,
          portfolio_url,
          email,
          employee_projects (
            utilization_percentage
          )
        `);

      if (roleFilter) {
        query = query.eq('talent_role', roleFilter);
      }

      if (locationFilter) {
        query = query.ilike('location', `%${locationFilter}%`);
      }

      if (searchTerm) {
        query = query.or(`bio.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data: talentData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (talentData) {
        console.log('Raw talent data from API:', talentData);
        // Since talent profiles now have first_name, last_name, and email directly
        const combinedData = talentData.map(talent => {
          console.log('Processing talent:', talent.id, 'first_name:', talent.first_name, 'last_name:', talent.last_name);
          return {
            ...talent,
            // Use first_name, last_name, and email directly from talent_profiles
            profiles: { 
              first_name: talent.first_name || '', 
              last_name: talent.last_name || '', 
              email: talent.email 
            }
          };
        });

        // Filter for available talent using new logic
        const availableTalents = combinedData.filter(talent => {
          if (talent.talent_type === 'prospect') {
            return talent.prospect_status === 'available' || !talent.prospect_status;
          } else {
            const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
            return totalUtilization < 100;
          }
        });

        console.log('Combined data:', availableTalents);
        setTalents(availableTalents);
      }
    } catch (error) {
      console.error('Error fetching talents:', error);
    }
    setIsLoading(false);
  };

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  console.log('🎨 SearchTalent component returning JSX, talents count:', talents.length);
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

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Search className="h-6 w-6 text-primary" />
                <span>Search Talent</span>
              </CardTitle>
              <CardDescription>
                Find the perfect talent for your project needs
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, skills, or bio..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as TalentRole | '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All roles</SelectItem>
                    <SelectItem value="engineer">Engineer</SelectItem>
                    <SelectItem value="designer">Designer</SelectItem>
                    <SelectItem value="pm">Product Manager</SelectItem>
                    <SelectItem value="qa">QA Engineer</SelectItem>
                    <SelectItem value="data_scientist">Data Scientist</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-muted rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded mb-2"></div>
                        <div className="h-3 bg-muted rounded w-24"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : talents.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No talent found</p>
                <p className="text-muted-foreground">
                  Try adjusting your search criteria or add new talent to the platform
                </p>
              </div>
            ) : (
              talents.map((talent, index) => (
                <motion.div
                  key={talent.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4 mb-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(talent.profiles?.first_name, talent.profiles?.last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-foreground">
                            {talent.profiles?.first_name} {talent.profiles?.last_name}
                          </h3>
                          <Badge variant="secondary" className="capitalize">
                            {talent.talent_role.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {talent.bio || 'No bio available'}
                      </p>

                      <div className="space-y-2 mb-4">
                        {talent.location && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{talent.location}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{talent.years_experience} years experience</span>
                        </div>

                        {talent.hourly_rate && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>${talent.hourly_rate}/hour</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          {talent.remote_preference && (
                            <Badge variant="outline" className="text-xs">Remote OK</Badge>
                          )}
                          <Badge variant="outline" className="text-xs capitalize">
                            {talent.talent_type === 'prospect' 
                              ? (talent.prospect_status || 'available')
                              : (talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) >= 100 ? 'occupied' : 'available')
                            }
                          </Badge>
                        </div>

                        <div className="flex space-x-2">
                          {talent.linkedin_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(talent.linkedin_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          {talent.github_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(talent.github_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          {talent.portfolio_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(talent.portfolio_url, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SearchTalent;