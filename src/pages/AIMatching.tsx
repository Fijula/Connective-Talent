import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Brain, Zap, Users, Target, RefreshCw, User, Briefcase, Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { aiService } from '@/services/aiService';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface TalentProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  talent_role: string;
  years_experience: number;
  skills: string[];
  location: string;
  bio?: string;
  certifications?: string;
  education?: string;
  work_experience?: string;
  talent_type: string;
  prospect_status?: string;
  employee_projects?: Array<{
    project_name: string;
    utilization_percentage: number;
  }>;
}

interface Opportunity {
  id: string;
  title: string;
  description: string;
  required_role: string;
  location: string;
  start_date: string;
  status: string;
}

interface TalentMatch {
  talent: TalentProfile;
  matchScore: number;
  explanation: string;
}

interface OpportunityMatch {
  opportunity: Opportunity;
  matchScore: number;
  explanation: string;
}

const AIMatching = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('by-opportunity');
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>('');
  const [selectedTalent, setSelectedTalent] = useState<string>('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [talents, setTalents] = useState<TalentProfile[]>([]);
  const [talentMatches, setTalentMatches] = useState<TalentMatch[]>([]);
  const [opportunityMatches, setOpportunityMatches] = useState<OpportunityMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [voiceQuery, setVoiceQuery] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [stats, setStats] = useState({
    totalTalent: 0,
    openOpportunities: 0,
    potentialMatches: 0
  });
  const [useAIMatching, setUseAIMatching] = useState(true); // Toggle for AI vs rule-based matching

  useEffect(() => {
    fetchOpportunities();
    fetchTalents();
    fetchStats();
    initializeSpeechRecognition();
  }, []);

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setIsVoiceMode(true);
        setInterimTranscript('');
        setVoiceQuery('');
        toast({
          title: "Voice Assistant Active",
          description: "Listening for your commands...",
        });
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        
        if (interim) {
          setInterimTranscript(interim);
        }
        
        if (final) {
          const finalTranscript = final.toLowerCase();
          setVoiceQuery(finalTranscript);
          setInterimTranscript('');
          processVoiceCommand(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Could not process voice command. Please try again.",
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      setSpeechRecognition(recognition);
    } else {
      toast({
        title: "Voice Assistant Not Supported",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
    }
  };

  const processVoiceCommand = async (transcript: string) => {
    console.log('Voice command:', transcript);
    
    // Clear existing results and set loading state immediately
    setTalentMatches([]);
    setOpportunityMatches([]);
    setIsLoading(true);
    
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('Voice command processing timeout');
      setIsLoading(false);
      toast({
        title: "Processing Timeout",
        description: "Voice command processing took too long. Please try again.",
        variant: "destructive",
      });
    }, 30000); // 30 second timeout
    
    try {
      // AI-powered voice command processing
      if (useAIMatching) {
        await processAIVoiceCommand(transcript);
        return;
      }
      
      // Fallback to rule-based processing
      await processRuleBasedVoiceCommand(transcript);
    } catch (error) {
      console.error('Voice command processing error:', error);
      setIsLoading(false);
      toast({
        title: "Processing Error",
        description: "Failed to process voice command. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clear the timeout
      clearTimeout(timeoutId);
    }
  };

  const processAIVoiceCommand = async (transcript: string) => {
    // Clear existing results and set loading state
    setTalentMatches([]);
    setOpportunityMatches([]);
    setIsLoading(true);
    
    try {
      // Create a comprehensive data context for the AI
      const talentNames = talents.map(t => `${t.first_name} ${t.last_name}`.toLowerCase().trim()).filter(Boolean);
      const opportunityTitles = opportunities.map(o => o.title?.toLowerCase()).filter(Boolean);
      const allSkills = Array.from(new Set(talents.flatMap(t => t.skills || []).filter(Boolean)));
      const allRoles = Array.from(new Set(talents.map(t => t.talent_role).filter(Boolean)));
      
      const prompt = `
You are an intelligent voice assistant for a talent matching system. Your job is to understand natural language voice commands and execute the most appropriate action.

VOICE COMMAND: "${transcript}"

SYSTEM CAPABILITIES:
- Find and display talent profiles
- Find and display job opportunities  
- Show a specific person's profile
- Match specific people to opportunities
- Match specific opportunities to people
- Filter by skills, roles, experience, location
- Show system statistics

AVAILABLE DATA:
- ${talents.length} talent profiles
- ${opportunities.length} job opportunities
- Skills: ${allSkills.slice(0, 20).join(', ')}${allSkills.length > 20 ? '...' : ''}
- Roles: ${allRoles.join(', ')}
- Talent Names: ${talentNames.slice(0, 10).join(', ')}${talentNames.length > 10 ? '...' : ''}
- Opportunity Titles: ${opportunityTitles.slice(0, 10).join(', ')}${opportunityTitles.length > 10 ? '...' : ''}

INTELLIGENT UNDERSTANDING:
- Handle misspellings and variations in names (e.g., "fibula" → "Fijula", "aniruddha" → "Anirudha")
- Understand natural language (e.g., "show me all QA people" = find talents with QA role)
- Interpret context clues (e.g., "files" often means "profiles" in this system)
- Handle partial names and fuzzy matching
- Understand technology names and their variations

DYNAMIC RESPONSE FORMAT:
You must respond with ONLY a valid JSON object. No markdown, no explanations, just raw JSON.

{
  "action": "find_talents|find_opportunities|show_talent_profile|match_talent_to_opportunity|match_opportunity_to_talents|show_stats",
  "filters": {
    "skills": ["skill1", "skill2"],
    "role": "specific_role",
    "experience_min": number,
    "talent_name": "exact_or_closest_name",
    "opportunity_title": "exact_or_closest_title",
    "location": "location_name"
  },
  "response": "Natural language response explaining what you're doing",
  "confidence": 0.95
}

EXAMPLES OF INTELLIGENT INTERPRETATION:
- "show fibula's profile" → show_talent_profile with talent_name: "Fijula" (fuzzy match)
- "find aniruddha opportunities" → match_talent_to_opportunity with talent_name: "Anirudha" (fuzzy match)  
- "show all qa files" → find_talents with role: "qa" (interpreting "files" as "profiles")
- "find react developers" → find_talents with skills: ["react"]
- "show me python jobs" → find_opportunities with skills: ["python"]
- "who's available for frontend work" → find_talents with role: "frontend_developer"
- "show all profiles" → find_talents with no filters
- "what opportunities do we have" → find_opportunities with no filters

IMPORTANT DISTINCTIONS:
- "show [name]'s profile" = show_talent_profile (just show their profile)
- "find [name] opportunities" = match_talent_to_opportunity (find opportunities for them)
- "show [name]" = show_talent_profile (just show their profile)
- "find opportunities for [name]" = match_talent_to_opportunity (find opportunities for them)

FUZZY NAME MATCHING RULES:
- "fibula" → "Fijula"
- "aniruddha" → "Anirudha" 
- "john" → "John" (exact match)
- "jane doe" → "Jane Doe" (exact match)
- Use phonetic similarity and character distance for misspellings
- Prioritize exact matches, then fuzzy matches
- If no close match found, return null for talent_name

CRITICAL: Be intelligent and adaptive. Understand the user's intent even with imperfect speech recognition or misspellings.`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Connectiv Talent - Voice Assistant',
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: [
            {
              role: 'system',
              content: 'You are a voice assistant for talent matching. Analyze voice commands and return ONLY valid JSON. Do not include markdown formatting, backticks, or any other text. Just pure JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Clean and parse JSON response
      let command;
      try {
        // Remove markdown formatting and clean the content
        const cleanedContent = content
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/`/g, '') // Remove backticks
          .trim();
        
        command = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('JSON parse error, trying to extract JSON from content:', parseError);
        console.log('Raw content:', content);
        
        // Try to extract JSON from the content using regex
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            command = JSON.parse(jsonMatch[0]);
          } catch (secondError) {
            console.error('Second JSON parse attempt failed:', secondError);
            throw new Error('Unable to parse AI response as JSON');
          }
        } else {
          throw new Error('No JSON found in AI response');
        }
      }
      
      // Execute the AI-determined action
      await executeAIVoiceAction(command);
      
    } catch (error) {
      console.error('AI voice processing error:', error);
      // Clear loading state first
      setIsLoading(false);
      
      // Show error message
      toast({
        title: "AI Processing Error",
        description: "Failed to process voice command with AI. Trying rule-based processing...",
        variant: "destructive",
      });
      
      // Fallback to rule-based processing
      await processRuleBasedVoiceCommand(transcript);
    }
  };

  // Fuzzy name matching function
  const findClosestName = (searchName: string, availableNames: string[]): string | null => {
    if (!searchName || !availableNames.length) return null;
    
    const searchLower = searchName.toLowerCase().trim();
    
    // First try exact match
    const exactMatch = availableNames.find(name => name.toLowerCase() === searchLower);
    if (exactMatch) return exactMatch;
    
    // Then try partial matches
    const partialMatches = availableNames.filter(name => 
      name.toLowerCase().includes(searchLower) || searchLower.includes(name.toLowerCase())
    );
    
    if (partialMatches.length === 1) return partialMatches[0];
    
    // Then try fuzzy matching using Levenshtein distance
    let bestMatch = null;
    let bestScore = Infinity;
    
    for (const name of availableNames) {
      const distance = levenshteinDistance(searchLower, name.toLowerCase());
      const similarity = 1 - (distance / Math.max(searchLower.length, name.length));
      
      // Only consider matches with >70% similarity
      if (similarity > 0.7 && distance < bestScore) {
        bestScore = distance;
        bestMatch = name;
      }
    }
    
    return bestMatch;
  };

  // Levenshtein distance calculation for fuzzy matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const executeAIVoiceAction = async (command: any) => {
    const { action, filters, response } = command;
    
    console.log('Executing AI voice action:', { action, filters, response });
    
    try {
      // Show AI response
      toast({
        title: "AI Voice Assistant",
        description: response,
      });

      switch (action) {
        case 'find_talents':
          console.log('Calling showAvailableTalents with filters:', filters);
          await showAvailableTalents(filters);
          break;
        case 'find_opportunities':
          console.log('Calling showOpenOpportunities with filters:', filters);
          await showOpenOpportunities(filters);
          break;
        case 'match_talent_to_opportunity':
          console.log('Calling handleTalentToOpportunityMatching with filters:', filters);
          await handleTalentToOpportunityMatching(filters);
          break;
        case 'match_opportunity_to_talents':
          console.log('Calling handleOpportunityToTalentsMatching with filters:', filters);
          await handleOpportunityToTalentsMatching(filters);
          break;
        case 'show_talent_profile':
          console.log('Calling showTalentProfile with filters:', filters);
          await showTalentProfile(filters);
          break;
        case 'show_stats':
          console.log('Calling showSystemStats');
          showSystemStats();
          break;
        default:
          console.log('Unknown AI action:', action);
          // Clear loading state for unknown actions
          setIsLoading(false);
          toast({
            title: "Unknown Command",
            description: "I couldn't understand that command. Please try again.",
            variant: "destructive",
          });
      }
    } catch (error) {
      console.error('Error executing AI voice action:', error);
      setIsLoading(false);
      toast({
        title: "Action Error",
        description: "Failed to execute the voice command action. Please try again.",
        variant: "destructive",
      });
    }
  };

  const showTalentProfile = async (filters: any) => {
    try {
      // Find the specific talent by name
      let targetTalent = null;
      if (filters?.talent_name) {
        const talentNames = talents.map(t => `${t.first_name} ${t.last_name}`.trim()).filter(Boolean);
        const closestName = findClosestName(filters.talent_name, talentNames);
        
        if (closestName) {
          targetTalent = talents.find(talent => 
            `${talent.first_name} ${talent.last_name}`.trim() === closestName
          );
        }
      }
      
      if (targetTalent) {
        // Show just this one talent profile (not matching to opportunities)
        const talentMatch = {
          talent: targetTalent,
          matchScore: 100,
          explanation: `Talent Profile: ${targetTalent.first_name} ${targetTalent.last_name} - ${targetTalent.talent_role} with ${targetTalent.years_experience} years experience. Skills: ${(targetTalent.skills || []).join(', ') || 'Not specified'}.`
        };
        
        setTalentMatches([talentMatch]);
        setActiveTab('by-opportunity'); // Show in the talent tab format
        
        toast({
          title: "Profile Found",
          description: `Showing profile for ${targetTalent.first_name} ${targetTalent.last_name}`,
        });
      } else {
        // If no specific talent found, show available talents
        await showAvailableTalents(filters);
      }
    } catch (error) {
      console.error('Error showing talent profile:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to show talent profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTalentToOpportunityMatching = async (filters: any) => {
    setActiveTab('by-talent');
    setTalentMatches([]);
    setIsLoading(true);
    
    try {
      // Find talent by name using fuzzy matching
      let targetTalent = null;
      if (filters?.talent_name) {
        const talentNames = talents.map(t => `${t.first_name} ${t.last_name}`.trim()).filter(Boolean);
        const closestName = findClosestName(filters.talent_name, talentNames);
        
        if (closestName) {
          targetTalent = talents.find(talent => 
            `${talent.first_name} ${talent.last_name}`.trim() === closestName
          );
          
          // Update the response to show the corrected name
          toast({
            title: "Name Match Found",
            description: `Found "${closestName}" for "${filters.talent_name}"`,
          });
        }
      }
      
      if (!targetTalent && talents.length > 0) {
        // If no specific talent found, show all available talents instead
        console.log('No specific talent found, showing all available talents');
        await showAvailableTalents(filters);
        return;
      }

      if (targetTalent) {
        // Use the existing matchOpportunitiesForTalent function with AI
        await matchOpportunitiesForTalent(targetTalent.id);
      } else {
        // If no talents found at all, show available talents
        console.log('No talents found, showing all available talents');
        await showAvailableTalents(filters);
      }
    } catch (error) {
      console.error('Error in handleTalentToOpportunityMatching:', error);
      toast({
        title: "Error",
        description: "Failed to find opportunities for talent.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpportunityToTalentsMatching = async (filters: any) => {
    setActiveTab('by-opportunity');
    setOpportunityMatches([]);
    setIsLoading(true);
    
    try {
      // Find opportunity by title or other criteria
      let targetOpportunity = null;
      if (filters?.opportunity_title) {
        const searchTitle = filters.opportunity_title.toLowerCase().trim();
        targetOpportunity = opportunities.find(opp => {
          const title = opp.title.toLowerCase();
          const description = (opp.description || '').toLowerCase();
          
          // Try exact match first
          if (title.includes(searchTitle)) return true;
          if (description.includes(searchTitle)) return true;
          
          // Try partial matches
          const titleWords = title.split(' ');
          return titleWords.some(word => word.includes(searchTitle));
        });
      }
      
      if (!targetOpportunity && opportunities.length > 0) {
        // If no specific opportunity found, show all open opportunities instead
        console.log('No specific opportunity found, showing all open opportunities');
        await showOpenOpportunities(filters);
        return;
      }

      if (targetOpportunity) {
        // Use the existing matchTalentsForOpportunity function with AI
        await matchTalentsForOpportunity(targetOpportunity.id);
      } else {
        // If no opportunities found at all, show open opportunities
        console.log('No opportunities found, showing all open opportunities');
        await showOpenOpportunities(filters);
      }
    } catch (error) {
      console.error('Error in handleOpportunityToTalentsMatching:', error);
      toast({
        title: "Error",
        description: "Failed to find talents for opportunity.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showAvailableTalents = async (filters: any) => {
    setActiveTab('by-opportunity');
    setOpportunityMatches([]);
    setIsLoading(true);
    
    try {
      let availableTalents = talents.filter(talent => {
        if (talent.talent_type === 'prospect') {
          return talent.prospect_status === 'available';
        } else {
          const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
          return totalUtilization < 100;
        }
      });

      // Apply AI-determined filters
      if (filters?.skills?.length > 0) {
        availableTalents = availableTalents.filter(talent => {
          const talentSkills = (talent.skills || []).map(s => s.toLowerCase());
          return filters.skills.some((skill: string) => 
            talentSkills.some(ts => ts.includes(skill.toLowerCase()))
          );
        });
      }

      if (filters?.role) {
        availableTalents = availableTalents.filter(talent => {
          const talentRole = talent.talent_role.toLowerCase();
          const searchRole = filters.role.toLowerCase();
          
          // Check direct role match
          if (talentRole.includes(searchRole) || searchRole.includes(talentRole)) {
            return true;
          }
          
          // Check if role appears in bio, work experience, or skills
          const talentText = `${talent.bio || ''} ${talent.work_experience || ''} ${talent.skills?.join(' ') || ''}`.toLowerCase();
          return talentText.includes(searchRole);
        });
      }

      if (filters?.experience_min) {
        availableTalents = availableTalents.filter(talent => 
          talent.years_experience >= filters.experience_min
        );
      }

      // Create contextual explanations based on filters (not AI matching)
      const talentMatches = availableTalents.map(talent => {
        let explanation = '';
        
        if (filters?.skills?.length > 0) {
          const matchingSkills = (talent.skills || []).filter(skill => 
            filters.skills.some(filterSkill => 
              skill.toLowerCase().includes(filterSkill.toLowerCase())
            )
          );
          explanation = `Available ${talent.talent_role} with ${talent.years_experience} years experience. Skills: ${(talent.skills || []).join(', ') || 'Not specified'}. ${matchingSkills.length > 0 ? `Matching skills: ${matchingSkills.join(', ')}.` : ''}`;
        } else if (filters?.role) {
          explanation = `Available ${talent.talent_role} with ${talent.years_experience} years experience. Skills: ${(talent.skills || []).join(', ') || 'Not specified'}.`;
        } else if (filters?.experience_min) {
          explanation = `Available ${talent.talent_role} with ${talent.years_experience} years experience (${talent.years_experience >= filters.experience_min ? 'meets' : 'exceeds'} minimum requirement). Skills: ${(talent.skills || []).join(', ') || 'Not specified'}.`;
        } else {
          explanation = `Available ${talent.talent_role} with ${talent.years_experience} years experience. Skills: ${(talent.skills || []).join(', ') || 'Not specified'}.`;
        }
        
        return {
          talent,
          matchScore: 100,
          explanation
        };
      });
      
      setTalentMatches(talentMatches);
    } catch (error) {
      console.error('Error in showAvailableTalents:', error);
      // Fallback to simple matching
      const fallbackTalents = talents.filter(talent => {
        if (talent.talent_type === 'prospect') {
          return talent.prospect_status === 'available';
        } else {
          const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
          return totalUtilization < 100;
        }
      });
      
      const talentMatches = fallbackTalents.map(talent => ({
        talent,
        matchScore: 100,
        explanation: 'Available talent'
      }));
      setTalentMatches(talentMatches);
    } finally {
      setIsLoading(false);
    }
  };

  const showOpenOpportunities = async (filters: any) => {
    setActiveTab('by-talent');
    setTalentMatches([]);
    setIsLoading(true);
    
    try {
      let openOpportunities = opportunities.filter(opp => opp.status === 'open');

      // Apply AI-determined filters
      if (filters?.skills?.length > 0) {
        openOpportunities = openOpportunities.filter(opp => {
          const oppText = opp.description.toLowerCase();
          return filters.skills.some((skill: string) => 
            oppText.includes(skill.toLowerCase())
          );
        });
      }

      if (filters?.role) {
        openOpportunities = openOpportunities.filter(opp => {
          const oppRole = opp.required_role.toLowerCase();
          const oppTitle = opp.title.toLowerCase();
          const oppDescription = opp.description.toLowerCase();
          const searchRole = filters.role.toLowerCase();
          
          // Check direct role match
          if (oppRole.includes(searchRole) || searchRole.includes(oppRole)) {
            return true;
          }
          
          // Check if role appears in title or description
          return oppTitle.includes(searchRole) || oppDescription.includes(searchRole);
        });
      }

      // Create contextual explanations based on filters (not AI matching)
      const opportunityMatches = openOpportunities.map(opportunity => {
        let explanation = '';
        
        if (filters?.skills?.length > 0) {
          const matchingSkills = filters.skills.filter(skill => 
            opportunity.description.toLowerCase().includes(skill.toLowerCase())
          );
          explanation = `Open ${opportunity.required_role} position at ${opportunity.location}. ${matchingSkills.length > 0 ? `Relevant skills: ${matchingSkills.join(', ')}. ` : ''}Description: ${opportunity.description.substring(0, 100)}${opportunity.description.length > 100 ? '...' : ''}`;
        } else if (filters?.role) {
          explanation = `Open ${opportunity.required_role} position at ${opportunity.location}. Description: ${opportunity.description.substring(0, 150)}${opportunity.description.length > 150 ? '...' : ''}`;
        } else {
          explanation = `Open ${opportunity.required_role} position at ${opportunity.location}. Description: ${opportunity.description.substring(0, 150)}${opportunity.description.length > 150 ? '...' : ''}`;
        }
        
        return {
          opportunity,
          matchScore: 100,
          explanation
        };
      });
      
      setOpportunityMatches(opportunityMatches);
    } catch (error) {
      console.error('Error in showOpenOpportunities:', error);
      // Fallback to simple matching
      const fallbackOpportunities = opportunities.filter(opp => opp.status === 'open');
      const opportunityMatches = fallbackOpportunities.map(opportunity => ({
        opportunity,
        matchScore: 100,
        explanation: 'Open opportunity'
      }));
      setOpportunityMatches(opportunityMatches);
    } finally {
      setIsLoading(false);
    }
  };

  const showSystemStats = () => {
    toast({
      title: "System Statistics",
      description: `Total Talents: ${stats.totalTalent}, Open Opportunities: ${stats.openOpportunities}, Potential Matches: ${stats.potentialMatches}`,
    });
  };

  const processRuleBasedVoiceCommand = async (transcript: string) => {
    console.log('Processing with rule-based system:', transcript);
    
    // Clear existing results and set loading state
    setTalentMatches([]);
    setOpportunityMatches([]);
    setIsLoading(true);
    
    // Dynamic intent analysis - extract keywords from actual data
    const analyzeIntent = (text: string) => {
      const words = text.toLowerCase().split(/\s+/);
      
      // Action words
      const actionWords = ['show', 'display', 'list', 'view', 'see', 'find', 'search', 'get', 'bring', 'give', 'present'];
      const hasAction = words.some(word => actionWords.includes(word));
      
      // Object words - what they want to see/find
      const opportunityWords = ['opportunities', 'opportunity', 'jobs', 'positions', 'projects', 'openings', 'vacancies', 'work', 'employment'];
      const talentWords = ['talents', 'talent', 'developers', 'engineers', 'designers', 'profiles', 'profile', 'people', 'candidates', 'team', 'staff', 'employees', 'files'];
      
      // Extract technology keywords from actual data
      const extractTechKeywords = () => {
        const allTechs = new Set();
        
        // Extract from talent skills
        talents.forEach(talent => {
          if (talent.skills && Array.isArray(talent.skills)) {
            talent.skills.forEach(skill => {
              if (skill && typeof skill === 'string') {
                // Add the skill and variations
                allTechs.add(skill.toLowerCase());
                // Add common variations
                const variations = skill.toLowerCase().split(/[,\s&]+/).filter(v => v.length > 1);
                variations.forEach(v => allTechs.add(v));
              }
            });
          }
          // Also extract from bio and work experience
          const textFields = [talent.bio, talent.work_experience, talent.education].filter(Boolean);
          textFields.forEach(text => {
            const techMatches = text.toLowerCase().match(/\b(react|angular|vue|javascript|typescript|php|python|java|node|mysql|postgresql|mongodb|aws|azure|docker|kubernetes|html|css|git|github|gitlab|jenkins|terraform|redis|elasticsearch|graphql|rest|api|microservices|devops|cloud|mobile|ios|android|flutter|react native|swift|kotlin|laravel|django|flask|express|spring|ruby|go|rust|c\+\+|c#|\.net|dotnet|jquery|bootstrap|tailwind|redux|mobx|prisma|sequelize|mongoose|firebase|supabase|websocket|socket\.io|vite|webpack|next|nuxt|svelte|sass|scss|mysql|postgresql|oracle|sql server|elasticsearch|cassandra|jenkins|gitlab|github|aws|azure|gcp|docker|kubernetes|terraform|microservices|react native|flutter|swift|kotlin|xamarin|graphql|rest|api|websocket|socket\.io|firebase|supabase|prisma|sequelize|mongoose|jquery|bootstrap|tailwind|material-ui|antd|chakra|redux|mobx|zustand|rxjs)\b/g);
            if (techMatches) {
              techMatches.forEach(match => allTechs.add(match));
            }
          });
        });
        
        // Extract from opportunity descriptions
        opportunities.forEach(opp => {
          const textFields = [opp.title, opp.description, opp.required_role].filter(Boolean);
          textFields.forEach(text => {
            const techMatches = text.toLowerCase().match(/\b(react|angular|vue|javascript|typescript|php|python|java|node|mysql|postgresql|mongodb|aws|azure|docker|kubernetes|html|css|git|github|gitlab|jenkins|terraform|redis|elasticsearch|graphql|rest|api|microservices|devops|cloud|mobile|ios|android|flutter|react native|swift|kotlin|laravel|django|flask|express|spring|ruby|go|rust|c\+\+|c#|\.net|dotnet|jquery|bootstrap|tailwind|redux|mobx|prisma|sequelize|mongoose|firebase|supabase|websocket|socket\.io|vite|webpack|next|nuxt|svelte|sass|scss|mysql|postgresql|oracle|sql server|elasticsearch|cassandra|jenkins|gitlab|github|aws|azure|gcp|docker|kubernetes|terraform|microservices|react native|flutter|swift|kotlin|xamarin|graphql|rest|api|websocket|socket\.io|firebase|supabase|prisma|sequelize|mongoose|jquery|bootstrap|tailwind|material-ui|antd|chakra|redux|mobx|zustand|rxjs)\b/g);
            if (techMatches) {
              techMatches.forEach(match => allTechs.add(match));
            }
          });
        });
        
        return Array.from(allTechs);
      };
      
      const techWords = extractTechKeywords();
      const roleWords = ['qa', 'quality assurance', 'engineer', 'designer', 'pm', 'product manager', 'manager', 'data', 'analyst', 'senior', 'junior', 'lead', 'architect', 'consultant', 'developer', 'programmer', 'coder'];
      
      // Context words
      const availableWords = ['available', 'open', 'active', 'current', 'existing'];
      
      const hasOpportunityIntent = words.some(word => opportunityWords.includes(word)) || 
                                   words.some((word, index) => {
                                     // Check for patterns like "qa opportunities", "react jobs", etc.
                                     const nextWord = words[index + 1];
                                     return opportunityWords.includes(nextWord);
                                   });
      const hasTalentIntent = words.some(word => talentWords.includes(word)) || 
                             words.some((word, index) => {
                               // Check for patterns like "qa talent", "react developers", etc.
                               const nextWord = words[index + 1];
                               return talentWords.includes(nextWord);
                             }) ||
                             // Special case: if "profile" is mentioned, prioritize talent intent
                             words.includes('profile');
      const hasTechIntent = words.some(word => techWords.includes(word));
      const hasRoleIntent = words.some(word => roleWords.includes(word));
      const hasAvailableIntent = words.some(word => availableWords.includes(word));
      
      return {
        hasAction,
        hasOpportunityIntent,
        hasTalentIntent,
        hasTechIntent,
        hasRoleIntent,
        hasAvailableIntent,
        extractedTech: words.filter(word => techWords.includes(word)),
        extractedRoles: words.filter(word => roleWords.includes(word))
      };
    };
    
    const intent = analyzeIntent(transcript);
    console.log('Intent analysis:', intent);
    
    // Priority 0: Profile-related queries always return talents
    if (transcript.toLowerCase().includes('profile')) {
      setActiveTab('by-opportunity'); // Show talents in the opportunity tab format
      setOpportunityMatches([]); // Clear opportunity matches when showing talents
      
      const availableTalents = talents.filter(talent => {
        if (talent.talent_type === 'prospect') {
          return talent.prospect_status === 'available';
        } else {
          const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
          return totalUtilization < 100;
        }
      });
      
      let filteredTalents = availableTalents;
      
      // Filter by technology/role if mentioned
      if (intent.hasTechIntent || intent.hasRoleIntent) {
        filteredTalents = availableTalents.filter(talent => {
          const talentText = `${talent.talent_role} ${talent.bio || ''} ${talent.skills?.join(' ') || ''} ${talent.work_experience || ''} ${talent.education || ''}`.toLowerCase();
          
          // Check for tech matches
          const techMatch = intent.extractedTech.some(tech => talentText.includes(tech));
          
          // Check for role matches - be more flexible
          const roleMatch = intent.extractedRoles.some(role => {
            const roleLower = role.toLowerCase();
            return talentText.includes(roleLower) ||
                   talent.talent_role.toLowerCase().includes(roleLower) ||
                   (roleLower.includes('engineer') && talentText.includes('engineer')) ||
                   (roleLower.includes('developer') && talentText.includes('developer')) ||
                   (roleLower.includes('backend') && talentText.includes('backend')) ||
                   (roleLower.includes('frontend') && talentText.includes('frontend'));
          });
          
          return techMatch || roleMatch;
        });
      }
      
      if (filteredTalents.length > 0) {
        const talentMatches = filteredTalents.map(talent => ({
          talent,
          matchScore: 85,
          explanation: `Available ${talent.talent_role} talent`
        }));
        
        setTalentMatches(talentMatches);
        toast({
          title: "Voice Command Processed",
          description: `Found ${filteredTalents.length} matching talent profiles`,
        });
        return;
      } else {
        // No filtered talents found, show all available talents instead
        console.log('No filtered talents found for profile query, showing all available talents');
        const allAvailableTalents = availableTalents.map(talent => ({
          talent,
          matchScore: 85,
          explanation: `Available ${talent.talent_role} talent`
        }));
        
        setTalentMatches(allAvailableTalents);
        toast({
          title: "Voice Command Processed",
          description: `Showing ${allAvailableTalents.length} available talent profiles`,
        });
        return;
      }
    }
    
    // Priority 1: Direct opportunity requests (but not if "profile" is mentioned)
    if (intent.hasOpportunityIntent && !intent.hasTalentIntent && !transcript.toLowerCase().includes('profile')) {
      setActiveTab('by-opportunity');
      setTalentMatches([]); // Clear talent matches when showing opportunities
      
      if (intent.hasTechIntent || intent.hasRoleIntent) {
        // Filter opportunities by technology/role with improved matching
        const filteredOpportunities = opportunities.filter(opp => {
          const oppText = `${opp.title} ${opp.description} ${opp.required_role}`.toLowerCase();
          
          // Check for exact matches first
          const exactTechMatch = intent.extractedTech.some(tech => oppText.includes(tech.toLowerCase()));
          const exactRoleMatch = intent.extractedRoles.some(role => oppText.includes(role.toLowerCase()));
          
          if (exactTechMatch || exactRoleMatch) return true;
          
          // Check for partial matches
          const partialTechMatch = intent.extractedTech.some(tech => {
            const techLower = tech.toLowerCase();
            return oppText.includes(techLower) || 
                   oppText.includes(`${techLower} `) ||
                   oppText.includes(` ${techLower}`);
          });
          
          // More flexible role matching
          const partialRoleMatch = intent.extractedRoles.some(role => {
            const roleLower = role.toLowerCase();
            return oppText.includes(roleLower) ||
                   opp.required_role?.toLowerCase().includes(roleLower) ||
                   opp.title.toLowerCase().includes(roleLower) ||
                   opp.description.toLowerCase().includes(roleLower) ||
                   // Handle common role variations
                   (roleLower.includes('engineer') && (oppText.includes('engineer') || oppText.includes('backend') || oppText.includes('frontend'))) ||
                   (roleLower.includes('developer') && (oppText.includes('developer') || oppText.includes('backend') || oppText.includes('frontend'))) ||
                   (roleLower.includes('backend') && (oppText.includes('backend') || oppText.includes('engineer'))) ||
                   (roleLower.includes('frontend') && (oppText.includes('frontend') || oppText.includes('engineer')));
          });
          
          return partialTechMatch || partialRoleMatch;
        });
        
        if (filteredOpportunities.length > 0) {
          const opportunityMatches = filteredOpportunities.map(opp => ({
            opportunity: opp,
            matchScore: 100,
            explanation: 'Matching opportunity'
          }));
          
          setOpportunityMatches(opportunityMatches);
          toast({
            title: "Voice Command Processed",
            description: `Found ${filteredOpportunities.length} matching opportunities`,
          });
          return;
        } else {
          // No matching opportunities found, show all opportunities instead
          console.log('No filtered opportunities found, showing all opportunities');
          const allOpportunities = opportunities.map(opp => ({
            opportunity: opp,
            matchScore: 100,
            explanation: 'Active opportunity'
          }));
          
          setOpportunityMatches(allOpportunities);
          toast({
            title: "Voice Command Processed",
            description: `Showing ${allOpportunities.length} active opportunities (no specific matches found)`,
          });
          return;
        }
      } else {
        // Show all opportunities
        const allOpportunities = opportunities.map(opp => ({
          opportunity: opp,
          matchScore: 100,
          explanation: 'Active opportunity'
        }));
        
        setOpportunityMatches(allOpportunities);
        toast({
          title: "Voice Command Processed",
          description: `Showing ${allOpportunities.length} active opportunities`,
        });
        return;
      }
    }
    
    // Priority 2: Direct talent requests
    if (intent.hasTalentIntent && !intent.hasOpportunityIntent) {
      setActiveTab('by-opportunity'); // Show talents in the opportunity tab format
      setOpportunityMatches([]); // Clear opportunity matches when showing talents
      
      const availableTalents = talents.filter(talent => {
        if (talent.talent_type === 'prospect') {
          return talent.prospect_status === 'available';
        } else {
          const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
          return totalUtilization < 100;
        }
      });
      
      let filteredTalents = availableTalents;
      
      if (intent.hasTechIntent || intent.hasRoleIntent) {
        filteredTalents = availableTalents.filter(talent => {
          const talentText = `${talent.talent_role} ${talent.bio || ''} ${talent.skills?.join(' ') || ''} ${talent.work_experience || ''} ${talent.education || ''}`.toLowerCase();
          
          // Check for exact matches first
          const exactTechMatch = intent.extractedTech.some(tech => talentText.includes(tech.toLowerCase()));
          const exactRoleMatch = intent.extractedRoles.some(role => talentText.includes(role.toLowerCase()));
          
          if (exactTechMatch || exactRoleMatch) return true;
          
          // Check for partial matches (e.g., "php" matching "php developer")
          const partialTechMatch = intent.extractedTech.some(tech => {
            const techLower = tech.toLowerCase();
            return talentText.includes(techLower) || 
                   talent.skills?.some((skill: string) => skill.toLowerCase().includes(techLower)) ||
                   talentText.includes(`${techLower} `) ||
                   talentText.includes(` ${techLower}`);
          });
          
          // More flexible role matching
          const partialRoleMatch = intent.extractedRoles.some(role => {
            const roleLower = role.toLowerCase();
            return talentText.includes(roleLower) ||
                   talent.talent_role?.toLowerCase().includes(roleLower) ||
                   // Handle common role variations
                   (roleLower.includes('engineer') && (talentText.includes('engineer') || talentText.includes('backend') || talentText.includes('frontend'))) ||
                   (roleLower.includes('developer') && (talentText.includes('developer') || talentText.includes('backend') || talentText.includes('frontend'))) ||
                   (roleLower.includes('backend') && (talentText.includes('backend') || talentText.includes('engineer'))) ||
                   (roleLower.includes('frontend') && (talentText.includes('frontend') || talentText.includes('engineer')));
          });
          
          return partialTechMatch || partialRoleMatch;
        });
      }
      
      if (filteredTalents.length > 0) {
        const talentMatches = filteredTalents.map(talent => ({
          talent,
          matchScore: 85,
          explanation: `Available ${talent.talent_role} talent`
        }));
        
        setTalentMatches(talentMatches);
        toast({
          title: "Voice Command Processed",
          description: `Found ${filteredTalents.length} matching talents`,
        });
        return;
      } else {
        // No filtered talents found, show all available talents instead
        console.log('No filtered talents found, showing all available talents');
        const allAvailableTalents = availableTalents.map(talent => ({
          talent,
          matchScore: 85,
          explanation: `Available ${talent.talent_role} talent`
        }));
        
        setTalentMatches(allAvailableTalents);
        toast({
          title: "Voice Command Processed",
          description: `Showing ${allAvailableTalents.length} available talents (no specific matches found)`,
        });
        return;
      }
    }
    
    // Priority 3: Name-based search with fuzzy matching
    let nameMatch = null;
    const words = transcript.toLowerCase().split(/\s+/);
    const talentNames = talents.map(t => `${t.first_name} ${t.last_name}`.trim()).filter(Boolean);
    
    // Try to find name mentions in the transcript
    for (const word of words) {
      if (word.length >= 3) { // Only check words with 3+ characters
        const closestName = findClosestName(word, talentNames);
        if (closestName) {
          nameMatch = talents.find(talent => 
            `${talent.first_name} ${talent.last_name}`.trim() === closestName
          );
          if (nameMatch) break;
        }
      }
    }
    
    if (nameMatch) {
      setSelectedTalent(nameMatch.id);
      setActiveTab('by-talent');
      setTimeout(() => {
        matchOpportunitiesForTalent(nameMatch.id);
      }, 500);
      
      // Check if this was a fuzzy match
      const originalWord = words.find(word => {
        if (word.length >= 3) {
          const closestName = findClosestName(word, talentNames);
          return closestName === `${nameMatch.first_name} ${nameMatch.last_name}`.trim();
        }
        return false;
      });
      
      const isFuzzyMatch = originalWord && originalWord !== `${nameMatch.first_name} ${nameMatch.last_name}`.toLowerCase();
      
      toast({
        title: isFuzzyMatch ? "Fuzzy Name Match Found" : "Voice Command Processed",
        description: isFuzzyMatch 
          ? `Found "${nameMatch.first_name} ${nameMatch.last_name}" for "${originalWord}"`
          : `Finding opportunities for ${nameMatch.first_name} ${nameMatch.last_name}`,
      });
      return;
    }
    
    // Priority 4: Technology/role-based search without explicit intent
    if (intent.hasTechIntent || intent.hasRoleIntent) {
      // Search both opportunities and talents
      const matchingOpportunities = opportunities.filter(opp => {
        const oppText = `${opp.title} ${opp.description} ${opp.required_role}`.toLowerCase();
        
        // Check for tech matches
        const techMatch = intent.extractedTech.some(tech => oppText.includes(tech));
        
        // More flexible role matching
        const roleMatch = intent.extractedRoles.some(role => {
          const roleLower = role.toLowerCase();
          return oppText.includes(roleLower) ||
                 opp.title.toLowerCase().includes(roleLower) ||
                 opp.description.toLowerCase().includes(roleLower) ||
                 opp.required_role.toLowerCase().includes(roleLower) ||
                 // Handle common role variations
                 (roleLower.includes('engineer') && (oppText.includes('engineer') || oppText.includes('backend') || oppText.includes('frontend'))) ||
                 (roleLower.includes('developer') && (oppText.includes('developer') || oppText.includes('backend') || oppText.includes('frontend'))) ||
                 (roleLower.includes('backend') && (oppText.includes('backend') || oppText.includes('engineer'))) ||
                 (roleLower.includes('frontend') && (oppText.includes('frontend') || oppText.includes('engineer')));
        });
        
        return techMatch || roleMatch;
      });
      
      const availableTalents = talents.filter(talent => {
        if (talent.talent_type === 'prospect') {
          return talent.prospect_status === 'available';
        } else {
          const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
          return totalUtilization < 100;
        }
      });
      
      const matchingTalents = availableTalents.filter(talent => {
        const talentText = `${talent.talent_role} ${talent.bio || ''} ${talent.skills?.join(' ') || ''} ${talent.work_experience || ''} ${talent.education || ''}`.toLowerCase();
        
        // Check for tech matches
        const techMatch = intent.extractedTech.some(tech => talentText.includes(tech));
        
        // More flexible role matching
        const roleMatch = intent.extractedRoles.some(role => {
          const roleLower = role.toLowerCase();
          return talentText.includes(roleLower) ||
                 talent.talent_role.toLowerCase().includes(roleLower) ||
                 // Handle common role variations
                 (roleLower.includes('engineer') && (talentText.includes('engineer') || talentText.includes('backend') || talentText.includes('frontend'))) ||
                 (roleLower.includes('developer') && (talentText.includes('developer') || talentText.includes('backend') || talentText.includes('frontend'))) ||
                 (roleLower.includes('backend') && (talentText.includes('backend') || talentText.includes('engineer'))) ||
                 (roleLower.includes('frontend') && (talentText.includes('frontend') || talentText.includes('engineer')));
        });
        
        return techMatch || roleMatch;
      });
      
      // Prioritize opportunities if both exist, otherwise show talents
      if (matchingOpportunities.length > 0) {
        setActiveTab('by-opportunity');
        const opportunityMatches = matchingOpportunities.map(opp => ({
          opportunity: opp,
          matchScore: 90,
          explanation: 'Technology/role match'
        }));
        
        setOpportunityMatches(opportunityMatches);
        toast({
          title: "Voice Command Processed",
          description: `Found ${matchingOpportunities.length} matching opportunities`,
        });
        return;
      } else if (matchingTalents.length > 0) {
        setActiveTab('by-opportunity');
        const talentMatches = matchingTalents.map(talent => ({
          talent,
          matchScore: 85,
          explanation: `Available ${talent.talent_role} talent`
        }));
        
        setTalentMatches(talentMatches);
        toast({
          title: "Voice Command Processed",
          description: `Found ${matchingTalents.length} matching talents`,
        });
        return;
      }
    }
    
    // Priority 5: General action words without specific objects
    if (intent.hasAction && !intent.hasOpportunityIntent && !intent.hasTalentIntent && !intent.hasTechIntent && !intent.hasRoleIntent) {
      // Default to showing opportunities
      setActiveTab('by-opportunity');
      const allOpportunities = opportunities.map(opp => ({
        opportunity: opp,
        matchScore: 100,
        explanation: 'All active opportunities'
      }));
      
      setOpportunityMatches(allOpportunities);
      toast({
        title: "Voice Command Processed",
        description: `Showing ${allOpportunities.length} active opportunities`,
      });
      return;
    }
    
    // Fallback: Try to be helpful with any remaining keywords - enhanced search
    const allWords = transcript.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const potentialMatches = [];
    
    // Enhanced keyword matching for opportunities
    opportunities.forEach(opp => {
      const oppText = `${opp.title} ${opp.description} ${opp.required_role}`.toLowerCase();
      const matchCount = allWords.filter(word => oppText.includes(word)).length;
      
      if (matchCount > 0) {
        potentialMatches.push({
          opportunity: opp,
          matchScore: Math.min(100, 60 + (matchCount * 10)), // Base score + bonus for multiple matches
          explanation: `${matchCount} keyword match${matchCount > 1 ? 'es' : ''}`
        });
      }
    });
    
    // Enhanced keyword matching for talents
    talents.forEach(talent => {
      const talentText = `${talent.talent_role} ${talent.bio || ''} ${talent.skills?.join(' ') || ''} ${talent.work_experience || ''} ${talent.education || ''}`.toLowerCase();
      const matchCount = allWords.filter(word => talentText.includes(word)).length;
      
      if (matchCount > 0) {
        potentialMatches.push({
          talent,
          matchScore: Math.min(100, 60 + (matchCount * 10)), // Base score + bonus for multiple matches
          explanation: `${matchCount} keyword match${matchCount > 1 ? 'es' : ''}`
        });
      }
    });
    
    if (potentialMatches.length > 0) {
      setActiveTab('by-opportunity');
      // Sort by match score and limit to top 10 results
      const sortedMatches = potentialMatches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
      setOpportunityMatches(sortedMatches);
      toast({
        title: "Found Potential Matches",
        description: `Found ${sortedMatches.length} items that might match your query`,
      });
    } else {
      // If still no matches, show all available data as last resort
      const allAvailableTalents = talents.filter(talent => {
        if (talent.talent_type === 'prospect') {
          return talent.prospect_status === 'available';
        } else {
          const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
          return totalUtilization < 100;
        }
      });
      
      if (allAvailableTalents.length > 0) {
        setActiveTab('by-opportunity');
        const talentMatches = allAvailableTalents.map(talent => ({
          talent,
          matchScore: 50,
          explanation: 'Available talent (fallback)'
        }));
        setTalentMatches(talentMatches);
        toast({
          title: "Showing Available Talents",
          description: `Couldn't find specific matches, showing ${allAvailableTalents.length} available talents`,
        });
      } else {
        toast({
          title: "Command Not Understood",
          description: "I couldn't understand your request. Try being more specific about what you're looking for.",
          variant: "destructive",
        });
      }
    }
    
    // Always clear loading state at the end
    setIsLoading(false);
  };

  const startVoiceAssistant = () => {
    if (speechRecognition) {
      try {
        speechRecognition.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast({
          title: "Voice Assistant Error",
          description: "Could not start voice recognition. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const stopVoiceAssistant = () => {
    if (speechRecognition) {
      speechRecognition.stop();
    }
  };

  const clearVoiceQuery = () => {
    setVoiceQuery('');
    setInterimTranscript('');
    setIsVoiceMode(false);
    setTalentMatches([]);
    setOpportunityMatches([]);
    setSelectedOpportunity('');
    setSelectedTalent('');
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

  const fetchTalents = async () => {
    try {
      const { data, error } = await supabase
        .from('talent_profiles')
        .select(`
          *,
          employee_projects (
            project_name,
            utilization_percentage
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTalents(data || []);
    } catch (error) {
      console.error('Error fetching talents:', error);
    }
  };

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
      const { data: opportunitiesResult, error: oppError } = await supabase
        .from('opportunities')
        .select('id', { count: 'exact' })
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

      setStats({
        totalTalent: availableTalent,
        openOpportunities: opportunitiesResult?.length || 0,
        potentialMatches: availableTalent * (opportunitiesResult?.length || 0)
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const calculateMatchScore = (talent: TalentProfile, opportunity: Opportunity): { score: number; explanation: string } => {
    let score = 0;
    const factors: string[] = [];

    // Skills match (50% weight) - MAXIMUM WEIGHTAGE as requested
    const opportunityText = opportunity.description.toLowerCase();
    const talentSkills = talent.skills || [];
    const talentBio = (talent.bio || '').toLowerCase();
    const talentWorkExp = (talent.work_experience || '').toLowerCase();
    const talentEducation = (talent.education || '').toLowerCase();
    const talentCertifications = (talent.certifications || '').toLowerCase();
    
    // Combine all talent text for semantic analysis
    const talentText = `${talentBio} ${talentWorkExp} ${talentEducation} ${talentCertifications} ${talentSkills.join(' ')}`.toLowerCase();
    
    // Enhanced tech keywords with better categorization
    const techKeywords = [
      // Frontend
      'react', 'angular', 'vue', 'javascript', 'typescript', 'html', 'css', 'sass', 'less', 'webpack', 'babel',
      // Backend
      'node', 'python', 'java', 'c#', 'php', 'ruby', 'go', 'rust', 'spring', 'hibernate',
      // Databases
      'sql', 'mongodb', 'postgresql', 'mysql', 'redis', 'elasticsearch', 'oracle',
      // Cloud & DevOps
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd', 'devops', 'terraform',
      // Testing
      'jest', 'cypress', 'selenium', 'junit', 'pytest', 'testng',
      // Methodologies
      'agile', 'scrum', 'kanban', 'tdd', 'bdd',
      // Other
      'api', 'rest', 'graphql', 'microservices', 'machine learning', 'ai', 'data science', 'analytics', 'blockchain', 'mobile', 'ios', 'android'
    ];
    
    let skillMatches = 0;
    let totalRelevantSkills = 0;
    
    techKeywords.forEach(keyword => {
      const inOpportunity = opportunityText.includes(keyword);
      const inTalent = talentText.includes(keyword) || talentSkills.some(skill => skill.toLowerCase().includes(keyword));
      
      if (inOpportunity) {
        totalRelevantSkills++;
        if (inTalent) {
          skillMatches++;
        }
      }
    });
    
    if (totalRelevantSkills > 0) {
      const skillScore = (skillMatches / totalRelevantSkills) * 50; // Increased from 30% to 50%
      score += skillScore;
      factors.push(`${skillMatches}/${totalRelevantSkills} relevant skills matched`);
    } else {
      factors.push('No specific skills mentioned in opportunity');
    }

    // Role match (25% weight) - More flexible matching across all text fields
    const talentRole = talent.talent_role.toLowerCase();
    const oppRole = opportunity.required_role.toLowerCase();
    const oppTitle = opportunity.title.toLowerCase();
    const oppDescription = opportunity.description.toLowerCase();
    
    // Check for exact role match
    if (talentRole === oppRole) {
      score += 25;
      factors.push('Perfect role match');
    } else if (talentRole.includes(oppRole) || oppRole.includes(talentRole)) {
      score += 20;
      factors.push('Partial role match');
    } else if (isRelatedRole(talentRole, oppRole)) {
      score += 10;
      factors.push('Related role match');
    } else {
      // Check if talent role appears in opportunity title or description
      if (oppTitle.includes(talentRole) || oppDescription.includes(talentRole)) {
        score += 15;
        factors.push('Role found in opportunity text');
      } else if (talentRole.includes('engineer') && (oppTitle.includes('engineer') || oppDescription.includes('engineer'))) {
        score += 12;
        factors.push('Engineer role match');
      } else if (talentRole.includes('developer') && (oppTitle.includes('developer') || oppDescription.includes('developer'))) {
        score += 12;
        factors.push('Developer role match');
      } else if (talentRole.includes('backend') && (oppTitle.includes('backend') || oppDescription.includes('backend'))) {
        score += 12;
        factors.push('Backend role match');
      } else if (talentRole.includes('frontend') && (oppTitle.includes('frontend') || oppDescription.includes('frontend'))) {
        score += 12;
        factors.push('Frontend role match');
      } else {
        score -= 5; // Reduced penalty for role mismatch
        factors.push('Role mismatch');
      }
    }

    // Experience match (15% weight) - Same as before
    const expScore = Math.min(15, (talent.years_experience / 8) * 15);
    score += expScore;
    factors.push(`${talent.years_experience} years experience`);

    // Location match (5% weight) - Reduced from 10%
    if (talent.location && opportunity.location) {
      const talentLoc = talent.location.toLowerCase();
      const oppLoc = opportunity.location.toLowerCase();
      
      if (talentLoc === oppLoc) {
        score += 5;
        factors.push('Location match');
      } else if (talentLoc.includes(oppLoc) || oppLoc.includes(talentLoc)) {
        score += 3;
        factors.push('Similar location');
      } else {
        factors.push('Location mismatch');
      }
    }

    // Bio/Description semantic match (5% weight) - Same as before
    if (talent.bio && opportunity.description) {
      const bioWords = talent.bio.toLowerCase().split(/\s+/);
      const oppWords = opportunity.description.toLowerCase().split(/\s+/);
      const commonWords = bioWords.filter(word => oppWords.includes(word) && word.length > 3);
      
      if (commonWords.length > 0) {
        const semanticScore = Math.min(5, (commonWords.length / Math.max(bioWords.length, oppWords.length)) * 5);
        score += semanticScore;
        factors.push(`${commonWords.length} semantic matches in bio`);
      }
    }

    // Availability bonus/penalty
    if (talent.talent_type === 'prospect' && talent.prospect_status === 'available') {
      score += 5;
      factors.push('Available prospect');
    } else if (talent.talent_type === 'existing' && talent.employee_projects) {
      const totalUtilization = talent.employee_projects.reduce((sum, project) => sum + (project.utilization_percentage || 0), 0);
      if (totalUtilization >= 100) {
        score -= 20; // Reduced penalty
        factors.push('Fully utilized');
      } else if (totalUtilization >= 80) {
        score -= 5; // Reduced penalty
        factors.push('Highly utilized');
      } else {
        score += 3;
        factors.push('Available existing talent');
      }
    }

    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      explanation: factors.join('; ')
    };
  };

  // AI-powered matching function using OpenRouter
  const calculateAIMatchScore = async (talent: TalentProfile, opportunity: Opportunity): Promise<{ score: number; explanation: string }> => {
    try {
      const prompt = `
Analyze the compatibility between this talent profile and job opportunity. Provide a match score (0-100) and detailed explanation.

TALENT PROFILE:
- Name: ${talent.first_name} ${talent.last_name}
- Role: ${talent.talent_role}
- Experience: ${talent.years_experience} years
- Skills: ${(talent.skills || []).join(', ')}
- Bio: ${talent.bio || 'Not provided'}
- Work Experience: ${talent.work_experience || 'Not provided'}
- Education: ${talent.education || 'Not provided'}
- Certifications: ${talent.certifications || 'Not provided'}
- Location: ${talent.location || 'Not specified'}
- Type: ${talent.talent_type}
- Status: ${talent.prospect_status || 'Not specified'}

JOB OPPORTUNITY:
- Title: ${opportunity.title}
- Required Role: ${opportunity.required_role}
- Description: ${opportunity.description}
- Location: ${opportunity.location}
- Start Date: ${opportunity.start_date}
- Status: ${opportunity.status}

Consider these factors:
1. Skills alignment (40% weight)
2. Role compatibility (25% weight) - Check role in title, description, and required_role field
3. Experience level match (15% weight)
4. Location compatibility (10% weight)
5. Availability and timing (10% weight)

IMPORTANT: For role matching, look for role keywords in ALL text fields (title, description, required_role). 
For example, if talent is "backend_engineer" and opportunity title is "Senior Backend Engineer" but required_role is "engineer", 
this should still be considered a strong match. Be flexible with role variations and synonyms.

CRITICAL: You must respond with ONLY a valid JSON object. Do not include any markdown formatting, explanations, or additional text. Just the raw JSON.

Return ONLY a JSON object with this exact format:
{
  "score": 85,
  "explanation": "Strong match due to excellent skills alignment in React and Node.js, perfect role fit for Senior Frontend Developer, 5+ years experience matches requirements, remote work compatible, and talent is currently available."
}
`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Connectiv Talent - AI Matching',
        },
        body: JSON.stringify({
          model: 'openrouter/auto',
          messages: [
            {
              role: 'system',
              content: 'You are an expert talent acquisition AI. Analyze talent-opportunity matches with precision. CRITICAL: Return ONLY valid JSON with score (0-100) and detailed explanation. Do not include markdown formatting, backticks, or any other text. Just pure JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Clean and parse JSON response
      let matchResult;
      try {
        // Remove markdown formatting and clean the content
        const cleanedContent = content
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .replace(/`/g, '') // Remove backticks
          .trim();
        
        matchResult = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('JSON parse error in AI matching, trying to extract JSON from content:', parseError);
        console.log('Raw content:', content);
        
        // Try to extract JSON from the content using regex
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            matchResult = JSON.parse(jsonMatch[0]);
          } catch (secondError) {
            console.error('Second JSON parse attempt failed:', secondError);
            throw new Error('Unable to parse AI response as JSON');
          }
        } else {
          throw new Error('No JSON found in AI response');
        }
      }
      
      return {
        score: Math.max(0, Math.min(100, matchResult.score)),
        explanation: matchResult.explanation
      };
    } catch (error) {
      console.error('AI matching error:', error);
      // Fallback to rule-based matching
      return calculateMatchScore(talent, opportunity);
    }
  };

  // Helper function to determine if roles are related
  const isRelatedRole = (role1: string, role2: string): boolean => {
    const roleRelations = {
      'engineer': ['developer', 'programmer', 'software engineer'],
      'developer': ['engineer', 'programmer', 'software engineer'],
      'designer': ['ui designer', 'ux designer', 'graphic designer'],
      'qa': ['quality assurance', 'tester', 'test engineer'],
      'pm': ['product manager', 'project manager', 'program manager'],
      'data': ['data scientist', 'data analyst', 'data engineer']
    };
    
    for (const [key, related] of Object.entries(roleRelations)) {
      if (role1.includes(key) && related.some(r => role2.includes(r))) return true;
      if (role2.includes(key) && related.some(r => role1.includes(r))) return true;
    }
    return false;
  };

  const matchTalentsForOpportunity = async (opportunityId: string) => {
    setIsLoading(true);
    try {
      const opportunity = opportunities.find(opp => opp.id === opportunityId);
      if (!opportunity) return;

      const availableTalents = talents.filter(talent => {
        if (talent.talent_type === 'prospect') {
          return talent.prospect_status === 'available';
        } else {
          const totalUtilization = talent.employee_projects?.reduce((sum, project) => sum + (project.utilization_percentage || 0), 0) || 0;
          return totalUtilization < 100;
        }
      });

      const matches = await Promise.all(availableTalents.map(async talent => {
        const { score, explanation } = useAIMatching 
          ? await calculateAIMatchScore(talent, opportunity)
          : calculateMatchScore(talent, opportunity);
        return {
          talent,
          matchScore: score,
          explanation
        };
      }));
      
      matches.sort((a, b) => b.matchScore - a.matchScore);

      setTalentMatches(matches);
      
      toast({
        title: "Matching Complete!",
        description: `Found ${matches.length} potential matches for ${opportunity.title}.`,
      });
    } catch (error) {
      console.error('Error matching talents:', error);
      toast({
        title: "Error",
        description: "Failed to find matches. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const matchOpportunitiesForTalent = async (talentId: string) => {
    setIsLoading(true);
    try {
      const talent = talents.find(t => t.id === talentId);
      if (!talent) return;

      const matches = await Promise.all(opportunities.map(async opportunity => {
        const { score, explanation } = useAIMatching 
          ? await calculateAIMatchScore(talent, opportunity)
          : calculateMatchScore(talent, opportunity);
        return {
          opportunity,
          matchScore: score,
          explanation
        };
      }));
      
      matches.sort((a, b) => b.matchScore - a.matchScore);

      setOpportunityMatches(matches);
      
      toast({
        title: "Matching Complete!",
        description: `Found ${matches.length} potential opportunities for ${talent.first_name} ${talent.last_name}.`,
      });
    } catch (error) {
      console.error('Error matching opportunities:', error);
      toast({
        title: "Error",
        description: "Failed to find matches. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 75) return 'bg-blue-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">AI Matching</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAIMatching}
                    onChange={(e) => setUseAIMatching(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <Button 
                variant={isListening ? "destructive" : "default"}
                size="sm"
                onClick={isListening ? stopVoiceAssistant : startVoiceAssistant}
                className="flex items-center space-x-2"
                data-walkthrough="voice-assistant-section"
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    <span>Stop Voice Assistant</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    <span>AI Voice Assistant</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available Talent</p>
                    <p className="text-2xl font-bold text-foreground">{stats.totalTalent}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Open Opportunities</p>
                    <p className="text-2xl font-bold text-foreground">{stats.openOpportunities}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Voice Commands</p>
                    <p className="text-lg font-bold text-foreground">Try it!</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      "Find talent for [role]" or "Find opportunities for [name]"
                    </p>
                  </div>
                  <Mic className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Voice Query Display */}
          {(voiceQuery || interimTranscript || isVoiceMode) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-purple-200 bg-purple-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-full bg-purple-100">
                      <Mic className={`h-4 w-4 text-purple-600 ${isListening ? 'animate-pulse' : ''}`} />
                    </div>
                    <div className="flex-1">
                      {interimTranscript && (
                        <div>
                          <p className="text-sm font-medium text-purple-900">Listening:</p>
                          <p className="text-sm text-purple-600 italic">"{interimTranscript}"</p>
                        </div>
                      )}
                      {voiceQuery && !interimTranscript && (
                        <div>
                          <p className="text-sm font-medium text-purple-900">Voice Query:</p>
                          <p className="text-sm text-purple-700 italic">"{voiceQuery}"</p>
                        </div>
                      )}
                      {isListening && !interimTranscript && !voiceQuery && (
                        <div>
                          <p className="text-sm font-medium text-purple-900">Listening...</p>
                          <p className="text-sm text-purple-600 italic">Speak your command</p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearVoiceQuery}
                      className="ml-auto text-purple-600 hover:text-purple-800"
                    >
                      ✕
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {!isVoiceMode && (
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="by-opportunity" className="flex items-center space-x-2">
                <Briefcase className="h-4 w-4" />
                <span>By Opportunity</span>
              </TabsTrigger>
              <TabsTrigger value="by-talent" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>By Talent</span>
              </TabsTrigger>
              <TabsTrigger value="referral-matches" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Referral Matches</span>
              </TabsTrigger>
            </TabsList>
            )}

            <TabsContent value="by-opportunity" className="space-y-6">
              {!isVoiceMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Briefcase className="h-6 w-6 text-primary" />
                    <span>Find Talents for Opportunity</span>
                  </CardTitle>
                  <CardDescription>
                    Select an opportunity to find the best matching available talents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Select value={selectedOpportunity} onValueChange={setSelectedOpportunity}>
                      <SelectTrigger className="w-80">
                        <SelectValue placeholder="Select an opportunity" />
                      </SelectTrigger>
                      <SelectContent>
                        {opportunities.map((opportunity) => (
                          <SelectItem key={opportunity.id} value={opportunity.id}>
                            {opportunity.title} - {opportunity.required_role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => matchTalentsForOpportunity(selectedOpportunity)} 
                      disabled={!selectedOpportunity || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Finding Matches...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Find Matches
                        </>
                      )}
                    </Button>
                  </div>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="p-4 rounded-full bg-blue-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                      </div>
                      <p className="text-lg font-medium mb-2">Processing AI Matches...</p>
                      <p className="text-sm">Analyzing talent profiles and opportunities</p>
                      <p className="text-xs mt-2">This may take a few moments</p>
                    </div>
                  ) : talentMatches.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Matching Talents (Ranked by Score)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {talentMatches.map((match, index) => (
                          <motion.div
                            key={match.talent.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                              className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow h-full flex flex-col"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-foreground truncate">{match.talent.first_name} {match.talent.last_name}</h4>
                                  <p className="text-sm text-muted-foreground truncate">{match.talent.email}</p>
                                  <div className="flex items-center space-x-2 mt-2 flex-wrap">
                                    <Badge variant="secondary" className="capitalize text-xs">
                                      {match.talent.talent_role.replace('_', ' ')}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {match.talent.years_experience} years
                                    </Badge>
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full flex-shrink-0 ml-2 ${getMatchScoreBg(match.matchScore)}`}>
                                  <span className={`text-xs font-semibold ${getMatchScoreColor(match.matchScore)}`}>
                                    {Math.round(match.matchScore)}%
                                  </span>
                                </div>
                  </div>

                              <div className="mb-3">
                                <Progress value={match.matchScore} className="h-2" />
                              </div>
                              
                              <div className="text-xs text-muted-foreground flex-1 min-h-[60px] group">
                                <p className="font-medium mb-1">Match Analysis:</p>
                                <p className="line-clamp-3 group-hover:line-clamp-none group-hover:whitespace-normal">{match.explanation}</p>
                              </div>
                              
                              <div className="mt-auto pt-3 border-t border-border">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => navigate(`/talent-profile/${match.talent.id}`)}
                                >
                                  <User className="h-3 w-3 mr-2" />
                                  View Profile
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {isVoiceMode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mic className="h-6 w-6 text-purple-600" />
                      <span>Voice Search Results</span>
                    </CardTitle>
                    <CardDescription>
                      Results based on your voice command
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                  {/* Show talent matches if available */}
                  {talentMatches.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Matching Talents (Ranked by Score)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {talentMatches.map((match, index) => (
                          <motion.div
                            key={match.talent.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow h-full flex flex-col"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{match.talent.first_name} {match.talent.last_name}</h4>
                                <p className="text-sm text-muted-foreground">{match.talent.email}</p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <Badge variant="secondary" className="capitalize">
                                    {match.talent.talent_role.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline">
                                    {match.talent.years_experience} years
                                  </Badge>
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded-full ${getMatchScoreBg(match.matchScore)}`}>
                                <span className={`text-xs font-semibold ${getMatchScoreColor(match.matchScore)}`}>
                                  {Math.round(match.matchScore)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <Progress value={match.matchScore} className="h-2" />
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              <p className="font-medium mb-1">Match Analysis:</p>
                              <p>{match.explanation}</p>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-border">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => navigate(`/talent-profile/${match.talent.id}`)}
                              >
                                <User className="h-3 w-3 mr-2" />
                                View Profile
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : opportunityMatches.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Matching Opportunities (Ranked by Score)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {opportunityMatches.map((match, index) => (
                          <motion.div
                            key={match.opportunity.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow h-full flex flex-col"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-foreground truncate">{match.opportunity.title}</h4>
                                <p className="text-sm text-muted-foreground truncate">{match.opportunity.location}</p>
                                <div className="flex items-center space-x-2 mt-2 flex-wrap">
                                  <Badge variant="secondary" className="capitalize text-xs">
                                    {match.opportunity.required_role.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {new Date(match.opportunity.start_date).toLocaleDateString()}
                                  </Badge>
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded-full flex-shrink-0 ml-2 ${getMatchScoreBg(match.matchScore)}`}>
                                <span className={`text-xs font-semibold ${getMatchScoreColor(match.matchScore)}`}>
                                  {Math.round(match.matchScore)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <Progress value={match.matchScore} className="h-2" />
                            </div>
                            
                            <div className="text-xs text-muted-foreground flex-1 min-h-[60px]">
                              <p className="font-medium mb-1">Match Analysis:</p>
                              <p className="line-clamp-3">{match.explanation}</p>
                            </div>
                            
                            <div className="mt-auto pt-3 border-t border-border">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => navigate(`/opportunity-view/${match.opportunity.id}`)}
                              >
                                <Briefcase className="h-3 w-3 mr-2" />
                                View Opportunity
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="p-4 rounded-full bg-blue-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                      </div>
                      <p className="text-lg font-medium mb-2">Processing AI Matches...</p>
                      <p className="text-sm">Analyzing talent profiles and opportunities</p>
                      <p className="text-xs mt-2">This may take a few moments</p>
                    </div>
                  ) : voiceQuery ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="p-4 rounded-full bg-gray-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Mic className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium mb-2">No Matching Results Found</p>
                      <p className="text-sm">No results match your voice query: "{voiceQuery}"</p>
                      <p className="text-xs mt-2">Try asking for a different role or opportunity.</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              )}
            </TabsContent>

            <TabsContent value="by-talent" className="space-y-6">
              {!isVoiceMode && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-6 w-6 text-primary" />
                    <span>Find Opportunities for Talent</span>
                  </CardTitle>
                  <CardDescription>
                    Select a talent to find the best matching opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Select value={selectedTalent} onValueChange={setSelectedTalent}>
                      <SelectTrigger className="w-80">
                        <SelectValue placeholder="Select a talent" />
                      </SelectTrigger>
                      <SelectContent>
                          {talents.filter(talent => {
                            if (talent.talent_type === 'prospect') {
                              return talent.prospect_status === 'available';
                            } else {
                              const totalUtilization = talent.employee_projects?.reduce((sum: number, project: any) => sum + (project.utilization_percentage || 0), 0) || 0;
                              return totalUtilization < 100;
                            }
                          }).map((talent) => (
                          <SelectItem key={talent.id} value={talent.id}>
                            {talent.first_name} {talent.last_name} ({talent.talent_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={() => matchOpportunitiesForTalent(selectedTalent)} 
                      disabled={!selectedTalent || isLoading}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Finding Matches...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Find Matches
                        </>
                      )}
                    </Button>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="p-4 rounded-full bg-blue-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                      </div>
                      <p className="text-lg font-medium mb-2">Processing AI Matches...</p>
                      <p className="text-sm">Analyzing talent profiles and opportunities</p>
                      <p className="text-xs mt-2">This may take a few moments</p>
                    </div>
                  ) : opportunityMatches.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Matching Opportunities (Ranked by Score)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {opportunityMatches.map((match, index) => (
                          <motion.div
                            key={match.opportunity.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                              className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow h-full flex flex-col"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-foreground truncate">{match.opportunity.title}</h4>
                                  <p className="text-sm text-muted-foreground truncate">{match.opportunity.location}</p>
                                  <div className="flex items-center space-x-2 mt-2 flex-wrap">
                                    <Badge variant="secondary" className="capitalize text-xs">
                                      {match.opportunity.required_role.replace('_', ' ')}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {new Date(match.opportunity.start_date).toLocaleDateString()}
                                    </Badge>
                                  </div>
                                </div>
                                <div className={`px-2 py-1 rounded-full flex-shrink-0 ml-2 ${getMatchScoreBg(match.matchScore)}`}>
                                  <span className={`text-xs font-semibold ${getMatchScoreColor(match.matchScore)}`}>
                                    {Math.round(match.matchScore)}%
                                  </span>
                                </div>
                              </div>
                              
                              <div className="mb-3">
                                <Progress value={match.matchScore} className="h-2" />
                              </div>
                              
                              <div className="text-xs text-muted-foreground flex-1 min-h-[60px] group">
                                <p className="font-medium mb-1">Match Analysis:</p>
                                <p className="line-clamp-3 group-hover:line-clamp-none group-hover:whitespace-normal">{match.explanation}</p>
                              </div>
                              
                              <div className="mt-auto pt-3 border-t border-border">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full"
                                  onClick={() => navigate(`/opportunity-view/${match.opportunity.id}`)}
                                >
                                  <Briefcase className="h-3 w-3 mr-2" />
                                  View Opportunity
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {isVoiceMode && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mic className="h-6 w-6 text-purple-600" />
                      <span>Voice Search Results</span>
                    </CardTitle>
                    <CardDescription>
                      Results based on your voice command
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">

                  {/* Show opportunity matches if available */}
                  {opportunityMatches.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Matching Opportunities (Ranked by Score)</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {opportunityMatches.map((match, index) => (
                          <motion.div
                            key={match.opportunity.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow h-full flex flex-col"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{match.opportunity.title}</h4>
                                <p className="text-sm text-muted-foreground">{match.opportunity.location}</p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <Badge variant="secondary" className="capitalize">
                                    {match.opportunity.required_role.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline">
                                    {new Date(match.opportunity.start_date).toLocaleDateString()}
                                  </Badge>
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded-full ${getMatchScoreBg(match.matchScore)}`}>
                                <span className={`text-xs font-semibold ${getMatchScoreColor(match.matchScore)}`}>
                                  {Math.round(match.matchScore)}%
                                </span>
                              </div>
                            </div>
                            
                            <div className="mb-3">
                              <Progress value={match.matchScore} className="h-2" />
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              <p className="font-medium mb-1">Match Analysis:</p>
                              <p>{match.explanation}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="p-4 rounded-full bg-blue-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
                      </div>
                      <p className="text-lg font-medium mb-2">Processing AI Matches...</p>
                      <p className="text-sm">Analyzing talent profiles and opportunities</p>
                      <p className="text-xs mt-2">This may take a few moments</p>
                    </div>
                  ) : voiceQuery ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="p-4 rounded-full bg-gray-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Mic className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium mb-2">No Matching Results Found</p>
                      <p className="text-sm">No results match your voice query: "{voiceQuery}"</p>
                      <p className="text-xs mt-2">Try asking for a different talent or role.</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              )}
            </TabsContent>

            <TabsContent value="referral-matches" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-6 w-6 text-primary" />
                    <span>Referral Matches</span>
                  </CardTitle>
                  <CardDescription>
                    View how your referrals match against specific opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="p-4 rounded-full bg-blue-100 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-lg font-medium mb-2">Referral Matching Coming Soon</p>
                    <p className="text-sm">This feature will show how your referrals match against opportunities they were referred for.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default AIMatching;