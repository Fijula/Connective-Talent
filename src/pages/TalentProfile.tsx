import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, MapPin, Calendar, DollarSign, ExternalLink, Clock, User, Edit } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";

interface TalentProfile {
  id: string;
  talent_role: string;
  status: string;
  years_experience: number;
  // hourly_rate removed
  availability_start_date: string | null;
  remote_preference: boolean;
  bio: string | null;
  education: string | null;
  work_experience: string | null;
  certifications: string | null;
  location: string | null;
  timezone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  resume_url: string | null;
  email: string;
  avatar_url: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  talent_skills?: Array<{
    proficiency_level: number | null;
    years_experience: number | null;
    skills: {
      name: string;
      category: string;
    };
  }>;
}

export default function TalentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [talent, setTalent] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      navigate('/talent-pool');
      return;
    }
    fetchTalentProfile();
  }, [id]);

  const fetchTalentProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select(`
          *,
          talent_skills(
            proficiency_level,
            years_experience,
            skills(name, category)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Use first_name and last_name directly from talent_profiles table
      setTalent({ ...data, profiles: { 
        first_name: data.first_name || '', 
        last_name: data.last_name || '', 
        email: data.email 
      } } as TalentProfile);
    } catch (error) {
      console.error('Error fetching talent profile:', error);
      toast({
        title: "Error",
        description: "Failed to load talent profile.",
        variant: "destructive",
      });
      navigate('/talent-pool');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (talent: any) => {
    if (talent.talent_type === 'prospect') {
      const status = talent.prospect_status || 'available';
      switch (status) {
        case 'available': return 'bg-green-500/10 text-green-700 border-green-500/20';
        case 'interviewing': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
        case 'rejected': return 'bg-red-500/10 text-red-700 border-red-500/20';
        case 'inactive': return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
        default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      }
    } else {
      // For existing employees, determine status based on utilization
      const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
      if (totalUtilization >= 100) {
        return 'bg-red-500/10 text-red-700 border-red-500/20';
      } else {
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'frontend_developer': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'backend_developer': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'fullstack_developer': return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20';
      case 'designer': return 'bg-pink-500/10 text-pink-700 border-pink-500/20';
      case 'product_manager': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'data_scientist': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  const formatRole = (role: string): string => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatStatus = (talent: any): string => {
    if (talent.talent_type === 'prospect') {
      const status = talent.prospect_status || 'available';
      switch (status) {
        case 'interviewing': return 'Selection in Process';
        case 'inactive': return 'Inactive';
        default: return status.charAt(0).toUpperCase() + status.slice(1);
      }
    } else {
      const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
      return totalUtilization >= 100 ? 'Occupied' : 'Available';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-32" />
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!talent) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/talent-pool')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Talent Pool
          </Button>
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground">The talent profile you're looking for doesn't exist or has been removed.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const fullName = `${talent.profiles?.first_name || ''} ${talent.profiles?.last_name || ''}`.trim() || 'Unknown User';

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/talent-pool')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Talent Pool
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate(`/add-talent?edit=${talent.id}`)}
            className="flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Profile Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Header Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                   <Avatar className="h-20 w-20">
                     <AvatarImage src={talent.avatar_url || ''} alt={fullName} />
                     <AvatarFallback className="bg-primary/10 text-lg">
                       {fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                     </AvatarFallback>
                   </Avatar>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h1 className="text-2xl font-bold">{fullName}</h1>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={getRoleColor(talent.talent_role)}>
                          {formatRole(talent.talent_role)}
                        </Badge>
                        <Badge className={getStatusColor(talent)}>
                          {formatStatus(talent)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{talent.years_experience} years experience</span>
                      </div>
                      {/* hourly rate removed */}
                      {talent.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>{talent.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bio Card */}
            {talent.bio && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{talent.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Education */}
            {talent.education && (
              <Card>
                <CardHeader>
                  <CardTitle>Education</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{talent.education}</p>
                </CardContent>
              </Card>
            )}

            {/* Work Experience */}
            {talent.work_experience && (
              <Card>
                <CardHeader>
                  <CardTitle>Work Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{talent.work_experience}</p>
                </CardContent>
              </Card>
            )}

            {/* Certifications */}
            {talent.certifications && (
              <Card>
                <CardHeader>
                  <CardTitle>Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{talent.certifications}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills Card */}
            {talent.talent_skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Expertise</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {talent.talent_skills.map((skill, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{skill.skills.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({skill.skills.category})
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {skill.proficiency_level && `Level ${skill.proficiency_level}`}
                          {skill.years_experience && ` • ${skill.years_experience} years`}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center gap-3">
                   <Mail className="h-4 w-4 text-muted-foreground" />
                   <span className="text-sm">{talent.email}</span>
                 </div>
                {talent.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{talent.location}</span>
                  </div>
                )}
                {talent.timezone && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{talent.timezone}</span>
                  </div>
                )}
                {talent.availability_start_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Available from {new Date(talent.availability_start_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Work Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Remote Work</span>
                  <Badge variant={talent.remote_preference ? "default" : "secondary"}>
                    {talent.remote_preference ? "Preferred" : "Not Preferred"}
                  </Badge>
                </div>
                {/* hourly rate removed */}
              </CardContent>
            </Card>

            {/* Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {talent.linkedin_url && (
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href={talent.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      LinkedIn Profile
                    </a>
                  </Button>
                )}
                {talent.github_url && (
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href={talent.github_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      GitHub Profile
                    </a>
                  </Button>
                )}
                {talent.portfolio_url && (
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href={talent.portfolio_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Portfolio
                    </a>
                  </Button>
                )}
                {talent.resume_url && (
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href={talent.resume_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Resume
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}