import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Briefcase, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Edit, 
  Users,
  Clock,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';

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

interface TalentProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  talent_role: string;
  status: string;
}

interface Manager {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
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
  talent_profiles?: {
    first_name: string;
    last_name: string;
    talent_role: string;
  };
}

const opportunitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  requiredRole: z.string().min(1, 'Required role is required'),
  location: z.string().optional(),
  remoteAllowed: z.boolean(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  status: z.enum(['open', 'filled', 'cancelled', 'on_hold']),
  fulfillment_date: z.string().optional(),
  selected_talent_id: z.string().optional(),
  fulfilled_by: z.string().optional(),
});

type OpportunityFormData = z.infer<typeof opportunitySchema>;

const OpportunityView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [availableTalents, setAvailableTalents] = useState<TalentProfile[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: {
      remoteAllowed: true,
      status: 'open',
    }
  });

  useEffect(() => {
    if (id) {
      fetchOpportunity();
      fetchAvailableTalents();
      fetchManagers();
    }
  }, [id]);

  const fetchOpportunity = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOpportunity(data);

      // Fetch assignment if opportunity is filled
      if (data.status === 'filled') {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from('assignments')
          .select(`
            *,
            talent_profiles (
              first_name,
              last_name,
              talent_role
            )
          `)
          .eq('opportunity_id', id)
          .single();

        if (!assignmentError && assignmentData) {
          setAssignment(assignmentData);
        }
      }
    } catch (error) {
      console.error('Error fetching opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to fetch opportunity details",
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

  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email')
        .eq('is_manager', true)
        .order('first_name');

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const handleEdit = () => {
    if (!opportunity) return;
    
    form.reset({
      title: opportunity.title,
      description: opportunity.description || '',
      requiredRole: opportunity.required_role,
      location: opportunity.location || '',
      remoteAllowed: opportunity.remote_allowed || false,
      startDate: opportunity.start_date || '',
      endDate: opportunity.end_date || '',
      budgetMin: opportunity.budget_min || undefined,
      budgetMax: opportunity.budget_max || undefined,
      status: opportunity.status,
      fulfillment_date: opportunity.fulfilled_at ? new Date(opportunity.fulfilled_at).toISOString().split('T')[0] : '',
      selected_talent_id: opportunity.fulfilled_candidate_id || '',
      fulfilled_by: opportunity.fulfilled_by || '',
    });
    setIsEditing(true);
  };

  const handleSave = async (data: OpportunityFormData) => {
    if (!opportunity || !user) return;
    
    setIsLoading(true);
    try {
      // Update opportunity
      const updateData: any = {
        title: data.title,
        description: data.description || null,
        required_role: data.requiredRole as any,
        location: data.location || null,
        remote_allowed: data.remoteAllowed,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        budget_min: data.budgetMin || null,
        budget_max: data.budgetMax || null,
        status: data.status,
        updated_at: new Date().toISOString()
      };

      // Add fulfillment fields if status is 'filled'
      if (data.status === 'filled' && data.selected_talent_id && data.fulfillment_date) {
        updateData.fulfilled_by = data.fulfilled_by;
        updateData.fulfilled_at = new Date().toISOString();
        updateData.fulfilled_candidate_id = data.selected_talent_id;
      } else if (data.status !== 'filled') {
        // Clear fulfillment fields if status is not 'filled'
        updateData.fulfilled_by = null;
        updateData.fulfilled_at = null;
        updateData.fulfilled_candidate_id = null;
      }

      const { error: updateError } = await supabase
        .from('opportunities')
        .update(updateData)
        .eq('id', opportunity.id);

      if (updateError) throw updateError;

      // Handle assignment changes
      if (data.status === 'filled' && data.selected_talent_id && data.fulfillment_date) {
        if (assignment) {
          // Update existing assignment
          const { error: assignmentUpdateError } = await supabase
            .from('assignments')
            .update({
              talent_profile_id: data.selected_talent_id,
              start_date: data.fulfillment_date,
              status: 'active',
            })
            .eq('id', assignment.id);

          if (assignmentUpdateError) throw assignmentUpdateError;

          // Update previous talent status if changed
          if (assignment.talent_profile_id !== data.selected_talent_id) {
            await supabase
              .from('talent_profiles')
              .update({ status: 'available' })
              .eq('id', assignment.talent_profile_id);
          }
        } else {
          // Create new assignment
          const { error: assignmentError } = await supabase
            .from('assignments')
            .insert({
              opportunity_id: opportunity.id,
              talent_profile_id: data.selected_talent_id,
              start_date: data.fulfillment_date,
              status: 'active',
              assigned_by: user.id,
            });

          if (assignmentError) throw assignmentError;
        }

        // Update selected talent status
        const { error: talentUpdateError } = await supabase
          .from('talent_profiles')
          .update({ status: 'assigned' })
          .eq('id', data.selected_talent_id);

        if (talentUpdateError) throw talentUpdateError;
      } else if (assignment && data.status !== 'filled') {
        // Remove assignment if status is not filled
        const { error: deleteError } = await supabase
          .from('assignments')
          .delete()
          .eq('id', assignment.id);

        if (deleteError) throw deleteError;

        // Update talent status back to available
        const { error: talentUpdateError } = await supabase
          .from('talent_profiles')
          .update({ status: 'available' })
          .eq('id', assignment.talent_profile_id);

        if (talentUpdateError) throw talentUpdateError;
      }

      toast({
        title: "Success!",
        description: "Opportunity updated successfully.",
      });

      setIsEditing(false);
      fetchOpportunity();
      fetchAvailableTalents();
    } catch (error) {
      console.error('Error updating opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to update opportunity. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
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
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Opportunity not found</h1>
            <Button onClick={() => navigate('/talent-pool')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Talent Management
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-4 mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/talent-pool')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Talent Management
            </Button>
          </div>

          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center space-x-3">
                      <span>{opportunity.title}</span>
                      <Badge className={`${getStatusColor(opportunity.status)} hover:bg-white hover:text-black transition-colors`}>
                        {opportunity.status.charAt(0).toUpperCase() + opportunity.status.slice(1)}
                      </Badge>
                      <Badge className={`${getRoleColor(opportunity.required_role)} hover:bg-white hover:text-black transition-colors`}>
                        {getRoleLabel(opportunity.required_role)}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Created {new Date(opportunity.created_at).toLocaleDateString()}
                      {opportunity.updated_at !== opportunity.created_at && (
                        <span> • Updated {new Date(opportunity.updated_at).toLocaleDateString()}</span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                {!isEditing && (
                  <Button onClick={handleEdit} size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {isEditing ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opportunity Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Senior Frontend Developer for Mobile App" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe the project, requirements, goals, and what makes this opportunity exciting..."
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="requiredRole"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Required Role *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select required role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="engineer">Engineer</SelectItem>
                                <SelectItem value="designer">Designer</SelectItem>
                                <SelectItem value="product_manager">Product Manager</SelectItem>
                                <SelectItem value="qa_engineer">QA Engineer</SelectItem>
                                <SelectItem value="data_scientist">Data Scientist</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center space-x-2">
                              <MapPin className="h-4 w-4" />
                              <span>Location</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a location" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Mexico (Remote)">Mexico (Remote)</SelectItem>
                                <SelectItem value="Costa Rica (Remote)">Costa Rica (Remote)</SelectItem>
                                <SelectItem value="Colombia (Remote)">Colombia (Remote)</SelectItem>
                                <SelectItem value="Argentina (Remote)">Argentina (Remote)</SelectItem>
                                <SelectItem value="Peru (Remote)">Peru (Remote)</SelectItem>
                                <SelectItem value="El Salvador (Remote)">El Salvador (Remote)</SelectItem>
                                <SelectItem value="Dominican Republic (Remote)">Dominican Republic (Remote)</SelectItem>
                                <SelectItem value="Pune, India (Remote)">Pune, India (Remote)</SelectItem>
                                <SelectItem value="Lehi, Utah (Remote)">Lehi, Utah (Remote)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="remoteAllowed"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-3">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium">
                            Remote work allowed
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>Start Date</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>End Date</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="budgetMin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4" />
                              <span>Budget Min (USD)</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                placeholder="0.00" 
                                {...field} 
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="budgetMax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center space-x-2">
                              <DollarSign className="h-4 w-4" />
                              <span>Budget Max (USD)</span>
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                placeholder="0.00" 
                                {...field} 
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="filled">Filled</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch('status') === 'filled' && (
                      <>
                        <FormField
                          control={form.control}
                          name="fulfillment_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fulfillment Date</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="selected_talent_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Selected Candidate</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select candidate" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableTalents.map((talent) => (
                                    <SelectItem key={talent.id} value={talent.id}>
                                      {talent.first_name} {talent.last_name} - {getRoleLabel(talent.talent_role)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fulfilled_by"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fulfilled By</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select manager" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {managers.map((manager) => (
                                    <SelectItem key={manager.id} value={manager.id}>
                                      {manager.first_name} {manager.last_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <div className="flex justify-end space-x-4 pt-6">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="space-y-6">
                  {opportunity.description && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{opportunity.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {opportunity.location || 'Location not specified'}
                          {opportunity.remote_allowed && (
                            <Badge variant="outline" className="ml-2 text-xs">Remote OK</Badge>
                          )}
                        </span>
                      </div>

                      {opportunity.start_date && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Start: {new Date(opportunity.start_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {opportunity.end_date && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            End: {new Date(opportunity.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {(opportunity.budget_min || opportunity.budget_max) && (
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
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

                  {opportunity.status === 'filled' && (assignment || opportunity.fulfilled_candidate_id) && (
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                        <Users className="h-5 w-5" />
                        <span>Fulfillment Details</span>
                      </h3>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-4">
                            {assignment && (
                              <div className="flex items-center space-x-4">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <User className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold">
                                    {assignment.talent_profiles?.first_name} {assignment.talent_profiles?.last_name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {getRoleLabel(assignment.talent_profiles?.talent_role || '')}
                                  </p>
                                  {assignment.start_date && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Assigned on {new Date(assignment.start_date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/talent-profile/${assignment.talent_profile_id}`)}
                                >
                                  View Profile
                                </Button>
                              </div>
                            )}
                            
                            {opportunity.fulfilled_at && (
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>
                                  Fulfilled on {new Date(opportunity.fulfilled_at).toLocaleDateString()} at {new Date(opportunity.fulfilled_at).toLocaleTimeString()}
                                </span>
                              </div>
                            )}
                            
                            {opportunity.fulfilled_by && (
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span>
                                  Fulfilled by {managers.find(m => m.id === opportunity.fulfilled_by)?.first_name} {managers.find(m => m.id === opportunity.fulfilled_by)?.last_name}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default OpportunityView;
