// AI Service for Career Recommendations
// This service handles AI-powered career tips and course recommendations

export interface AICareerTip {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  relevance_score: number;
}

export interface AICourse {
  id: string;
  title: string;
  provider: string;
  url: string;
  thumbnail: string;
  duration: string;
  rating: number;
  skills: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  relevance_score: number;
  is_upskill: boolean;
}

export interface UserProfile {
  skills: string[];
  workExperience: string;
  education: string;
  name?: string;
  email?: string;
}

class AIService {
  private apiKey: string | null = null;
  private baseUrl: string = '';
  private debugMode: boolean = false;

  constructor() {
    // Initialize with environment variables
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
    this.baseUrl = 'https://openrouter.ai/api/v1'; // OpenRouter API endpoint
    this.debugMode = import.meta.env.VITE_AI_DEBUG === 'true';
    
    console.log('AI Service initialized:', {
      hasApiKey: !!this.apiKey,
      apiKeyLength: this.apiKey?.length || 0,
      debugMode: this.debugMode,
      baseUrl: this.baseUrl
    });
  }

  /**
   * Fetch personalized career tips using AI
   */
  async getCareerTips(userProfile: UserProfile): Promise<AICareerTip[]> {
    const prompt = this.buildCareerTipsPrompt(userProfile);
    
    try {
      if (this.apiKey) {
        return await this.callOpenAI(prompt);
      } else {
        return await this.mockAIResponse(prompt, 'career-tips');
      }
    } catch (error) {
      console.error('AI service error:', error);
      if (error instanceof Error && error.message === 'CREDIT_LIMIT_EXCEEDED') {
        console.log('Credit limit exceeded, using fallback career tips');
      } else {
        console.log('Falling back to mock career tips');
      }
      return this.getFallbackCareerTips();
    }
  }

  /**
   * Fetch personalized course recommendations using AI
   */
  async getCourseRecommendations(userProfile: UserProfile): Promise<AICourse[]> {
    const prompt = this.buildCoursePrompt(userProfile);
    
    try {
      if (this.apiKey) {
        return await this.callOpenAI(prompt);
      } else {
        return await this.mockAIResponse(prompt, 'courses');
      }
    } catch (error) {
      console.error('AI service error:', error);
      if (error instanceof Error && error.message === 'CREDIT_LIMIT_EXCEEDED') {
        console.log('Credit limit exceeded, using fallback courses');
      } else {
        console.log('Falling back to mock courses');
      }
      return this.getFallbackCourses();
    }
  }

  /**
   * Build AI prompt for career tips
   */
  private buildCareerTipsPrompt(userProfile: UserProfile): string {
    return `Based on the following user profile, provide 5 personalized career growth tips:

User Profile:
- Skills: ${userProfile.skills.join(', ')}
- Work Experience: ${userProfile.workExperience}
- Education: ${userProfile.education}
- Name: ${userProfile.name || 'Not provided'}
- Email: ${userProfile.email || 'Not provided'}

Please provide tips that:
1. Build on their current skills and experience
2. Address gaps in their skill set
3. Are relevant to their career level
4. Include both technical and soft skills
5. Are actionable and specific
6. Consider current industry trends (2024)

For each tip, provide:
- Title (concise and actionable)
- Description (2-3 sentences explaining the tip)
- Category (Technical Skills, Soft Skills, Leadership, Career Development, Networking, etc.)
- Difficulty level (Beginner/Intermediate/Advanced)
- Relevance score (1-10 based on how relevant it is to their profile)

Format as JSON array with these exact fields: id, title, description, category, difficulty, relevance_score

Example format:
[
  {
    "id": "tip-1",
    "title": "Master TypeScript for Better React Development",
    "description": "Learn TypeScript to write more maintainable and scalable React applications. This will make you a more valuable developer and open doors to senior positions.",
    "category": "Technical Skills",
    "difficulty": "Intermediate",
    "relevance_score": 9
  }
]`;
  }

  /**
   * Build AI prompt for course recommendations
   */
  private buildCoursePrompt(userProfile: UserProfile): string {
    return `Based on the following user profile, recommend EXACTLY 10 relevant online courses from YouTube and Udemy only:

User Profile:
- Skills: ${userProfile.skills.join(', ')}
- Work Experience: ${userProfile.workExperience}
- Education: ${userProfile.education}

CRITICAL: You MUST return exactly 10 courses. Do not return fewer than 10 courses.

IMPORTANT: Only recommend courses from YouTube and Udemy platforms.

Please recommend courses that:
1. Build on their current skills (skill-building courses)
2. Introduce new technologies they don't know (upskilling courses)
3. Are appropriate for their experience level
4. Include both free (YouTube) and paid (Udemy) options
5. Cover emerging technologies like AI/ML, cloud computing, modern frameworks
6. Are from reputable instructors and channels
7. Have high ratings and positive reviews
8. Are current and up-to-date (2023-2024)
9. Provide practical, hands-on learning
10. Lead to career advancement opportunities

For each course, provide:
- Title (specific, descriptive, and engaging)
- Provider (YouTube or Udemy only)
- URL (real course URL from YouTube or Udemy)
- Thumbnail URL (real thumbnail image from the platform)
- Duration (e.g., "20 hours", "15 hours", "3 weeks")
- Rating (1-5 based on real platform ratings)
- Skills covered (array of specific skills the course teaches)
- Difficulty level (Beginner/Intermediate/Advanced based on their current level)
- Relevance score (1-10 based on how relevant it is for their career growth)
- Whether it's upskilling (true if course introduces new skills, false if it builds on existing skills)

Format as JSON array with these exact fields: id, title, provider, url, thumbnail, duration, rating, skills, difficulty, relevance_score, is_upskill

Example format:
[
  {
    "id": "course-1",
    "title": "Complete React Developer Course 2024",
    "provider": "Udemy",
    "url": "https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
    "thumbnail": "https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg",
    "duration": "40 hours",
    "rating": 4.8,
    "skills": ["React", "JavaScript", "Redux", "Hooks"],
    "difficulty": "Intermediate",
    "relevance_score": 9,
    "is_upskill": false
  },
  {
    "id": "course-2",
    "title": "Python for Data Science - Complete Tutorial",
    "provider": "YouTube",
    "url": "https://www.youtube.com/watch?v=example",
    "thumbnail": "https://img.youtube.com/vi/example/maxresdefault.jpg",
    "duration": "15 hours",
    "rating": 4.6,
    "skills": ["Python", "Data Science", "Pandas", "NumPy"],
    "difficulty": "Beginner",
    "relevance_score": 8,
    "is_upskill": true
  }
]

IMPORTANT REMINDERS:
- You MUST return exactly 10 courses, not fewer
- Each course must have all required fields
- Use real URLs from YouTube and Udemy
- Mix of free (YouTube) and paid (Udemy) courses
- Include courses for different skill levels
- Ensure variety in topics and technologies
- Return ONLY the JSON array, no other text`;
  }


  /**
   * Call OpenRouter API (OpenAI-compatible)
   */
  private async callOpenAI(prompt: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin, // Required by OpenRouter
        'X-Title': 'Connectiv Talent - Career Development', // Optional app name
      },
      body: JSON.stringify({
        model: 'openrouter/auto', // Use OpenRouter auto model selection like ResumeUpload
        messages: [
          {
            role: 'system',
            content: 'You are a career development AI assistant. Provide personalized career advice and course recommendations based on user profiles. CRITICAL: You must respond with ONLY a valid JSON array. Do not include any markdown formatting, explanations, or additional text. Just the raw JSON array.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', response.status, errorData);
      
      // Check if it's a credit/payment error
      if (response.status === 402 || response.status === 429 || 
          errorData?.error?.message?.includes('credit') ||
          errorData?.error?.message?.includes('payment') ||
          errorData?.error?.message?.includes('quota')) {
        console.log('Credit limit exceeded, falling back to mock data');
        throw new Error('CREDIT_LIMIT_EXCEEDED');
      }
      
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    if (this.debugMode) {
      console.log('OpenRouter API Response:', data);
      console.log('Content:', content);
      console.log('Content length:', content?.length);
    }
    
    // Clean the response content - remove any markdown formatting or extra text
    let cleanContent = content.trim();
    
    try {
      // Remove common prefixes and suffixes
      cleanContent = cleanContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .replace(/^json\s*:\s*/i, '')
        .replace(/^response\s*:\s*/i, '')
        .replace(/^data\s*:\s*/i, '')
        .replace(/^result\s*:\s*/i, '')
        .trim();
      
      // Remove any text before the first [
      const arrayStart = cleanContent.indexOf('[');
      if (arrayStart > 0) {
        cleanContent = cleanContent.substring(arrayStart);
      }
      
      // Remove any text after the last ]
      const arrayEnd = cleanContent.lastIndexOf(']');
      if (arrayEnd > 0 && arrayEnd < cleanContent.length - 1) {
        cleanContent = cleanContent.substring(0, arrayEnd + 1);
      }
      
      // Final cleanup - remove any remaining non-JSON text
      cleanContent = cleanContent.trim();
      
      console.log('Cleaned AI service content for parsing:', cleanContent);
      
      // Validate that we have something to parse
      if (!cleanContent || cleanContent.length === 0) {
        throw new Error('No content to parse after cleaning');
      }
      
      // Check if it looks like JSON
      if (!cleanContent.startsWith('[') || !cleanContent.endsWith(']')) {
        throw new Error('Content does not appear to be a JSON array');
      }
      
      const parsed = JSON.parse(cleanContent);
      
      // Validate that it's an array
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }
      
      // Validate that it has content
      if (parsed.length === 0) {
        throw new Error('Response array is empty');
      }
      
      console.log(`Successfully parsed ${parsed.length} courses from AI response`);
      if (parsed.length < 10) {
        console.warn(`Warning: AI returned only ${parsed.length} courses, expected 10`);
      }
      
      return parsed;
    } catch (error) {
      console.error('Failed to parse OpenRouter response:', error);
      console.error('Raw response:', content);
      console.error('Cleaned content:', cleanContent);
      console.error('Content length:', content?.length || 0);
      console.error('Content type:', typeof content);
      console.error('Content preview (first 200 chars):', content?.substring(0, 200));
      
      // Try multiple extraction strategies
      const extractionStrategies = [
        // Strategy 1: Extract JSON array from content
        () => {
          const jsonStart = content.indexOf('[');
          const jsonEnd = content.lastIndexOf(']') + 1;
          if (jsonStart !== -1 && jsonEnd > jsonStart) {
            return content.substring(jsonStart, jsonEnd);
          }
          return null;
        },
        // Strategy 2: Look for JSON after "json" keyword
        () => {
          const jsonMatch = content.match(/json\s*:\s*(\[.*\])/is);
          if (jsonMatch) {
            return jsonMatch[1];
          }
          return null;
        },
        // Strategy 3: Look for JSON in code blocks
        () => {
          const codeBlockMatch = content.match(/```(?:json)?\s*(\[.*?\])\s*```/is);
          if (codeBlockMatch) {
            return codeBlockMatch[1];
          }
          return null;
        },
        // Strategy 4: Try to find any array-like structure
        () => {
          const arrayMatch = content.match(/(\[[\s\S]*?\])/);
          if (arrayMatch) {
            return arrayMatch[1];
          }
          return null;
        },
        // Strategy 5: Handle partial JSON responses (like the one shown in console)
        () => {
          // Look for JSON objects that might be part of an array
          const jsonObjects = content.match(/\{[^{}]*"id"[^{}]*\}/g);
          if (jsonObjects && jsonObjects.length > 0) {
            return '[' + jsonObjects.join(',') + ']';
          }
          return null;
        },
        // Strategy 6: Try to reconstruct array from individual objects
        () => {
          // Look for individual JSON objects and wrap them in an array
          const objectMatches = content.match(/\{[^{}]*(?:"id"|"title"|"description")[^{}]*\}/g);
          if (objectMatches && objectMatches.length > 0) {
            return '[' + objectMatches.join(',') + ']';
          }
          return null;
        },
        // Strategy 6b: Try to reconstruct array from course objects (with provider, url, etc.)
        () => {
          // Look for course objects with provider, url, thumbnail fields
          const courseMatches = content.match(/\{[^{}]*(?:"id"|"title"|"provider"|"url"|"thumbnail")[^{}]*\}/g);
          if (courseMatches && courseMatches.length > 0) {
            return '[' + courseMatches.join(',') + ']';
          }
          return null;
        },
        // Strategy 7: Try to fix common JSON issues
        () => {
          let fixedContent = content;
          
          // Fix common issues
          fixedContent = fixedContent
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Add quotes to unquoted keys
            .replace(/:\s*([^",{\[\s][^,}]*?)(\s*[,}])/g, ': "$1"$2') // Add quotes to unquoted string values
            .replace(/"\s*:\s*"([^"]*)"\s*([,}])/g, '": "$1"$2'); // Fix already quoted values
          
          // Try to find array structure
          const arrayStart = fixedContent.indexOf('[');
          const arrayEnd = fixedContent.lastIndexOf(']');
          if (arrayStart !== -1 && arrayEnd > arrayStart) {
            return fixedContent.substring(arrayStart, arrayEnd + 1);
          }
          return null;
        },
        // Strategy 8: Handle course-specific patterns (URLs, providers, etc.)
        () => {
          // Look for course objects with specific course-related fields
          const coursePattern = /\{[^{}]*(?:"id"|"title"|"provider"|"url"|"thumbnail"|"duration"|"rating"|"skills"|"difficulty")[^{}]*\}/g;
          const courseMatches = content.match(coursePattern);
          if (courseMatches && courseMatches.length > 0) {
            return '[' + courseMatches.join(',') + ']';
          }
          return null;
        }
      ];
      
      for (let i = 0; i < extractionStrategies.length; i++) {
        try {
          const extractedJson = extractionStrategies[i]();
          if (extractedJson) {
            console.log(`Attempting strategy ${i + 1} with extracted JSON:`, extractedJson);
            const parsed = JSON.parse(extractedJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`Successfully parsed JSON using strategy ${i + 1}`);
              return parsed;
            }
          }
        } catch (strategyError) {
          console.log(`Strategy ${i + 1} failed:`, strategyError.message);
          continue;
        }
      }
      
      // If all strategies fail, log detailed information and throw error
      console.error('All extraction strategies failed. Content analysis:');
      console.error('- Content length:', content?.length || 0);
      console.error('- Contains brackets:', content?.includes('[') && content?.includes(']'));
      console.error('- Contains braces:', content?.includes('{') && content?.includes('}'));
      console.error('- Contains "id":', content?.includes('"id"'));
      console.error('- Contains "title":', content?.includes('"title"'));
      console.error('- Contains "provider":', content?.includes('"provider"'));
      console.error('- Contains "url":', content?.includes('"url"'));
      console.error('- Contains "thumbnail":', content?.includes('"thumbnail"'));
      console.error('- Contains "description":', content?.includes('"description"'));
      console.error('- First 500 characters:', content?.substring(0, 500));
      
      throw new Error(`Invalid AI response format - could not extract valid JSON array from response. Content length: ${content?.length || 0}, Contains JSON markers: ${content?.includes('[') && content?.includes(']')}`);
    }
  }


  /**
   * Mock AI response for development/demo
   */
  private async mockAIResponse(prompt: string, type: string): Promise<any[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (type === 'career-tips') {
      return this.getMockCareerTips();
    } else {
      return this.getMockCourses();
    }
  }

  /**
   * Get mock career tips
   */
  private getMockCareerTips(): AICareerTip[] {
    return [
      {
        id: 'mock-tip-1',
        title: 'Master Modern JavaScript Frameworks',
        description: 'Focus on learning React, Vue, or Angular to stay competitive in the frontend development market. These skills are in high demand.',
        category: 'Technical Skills',
        difficulty: 'Intermediate',
        relevance_score: 8
      },
      {
        id: 'mock-tip-2',
        title: 'Build Your Professional Network',
        description: 'Connect with other developers on LinkedIn, attend meetups, and contribute to open source projects to expand your professional network.',
        category: 'Networking',
        difficulty: 'Beginner',
        relevance_score: 7
      }
    ];
  }

  /**
   * Get mock courses (YouTube and Udemy only)
   */
  private getMockCourses(): AICourse[] {
    return [
      {
        id: 'mock-course-1',
        title: 'Complete Web Development Bootcamp 2024',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/the-complete-web-developer-bootcamp/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '50 hours',
        rating: 4.7,
        skills: ['HTML', 'CSS', 'JavaScript', 'React'],
        difficulty: 'Beginner',
        relevance_score: 8,
        is_upskill: true
      },
      {
        id: 'mock-course-2',
        title: 'JavaScript Fundamentals - Complete Tutorial',
        provider: 'YouTube',
        url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
        thumbnail: 'https://img.youtube.com/vi/PkZNo7MFNFg/maxresdefault.jpg',
        duration: '15 hours',
        rating: 4.6,
        skills: ['JavaScript', 'Programming', 'ES6'],
        difficulty: 'Beginner',
        relevance_score: 7,
        is_upskill: false
      },
      {
        id: 'mock-course-3',
        title: 'React - The Complete Guide (incl Hooks, React Router, Redux)',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '40 hours',
        rating: 4.7,
        skills: ['React', 'JavaScript', 'Redux', 'Hooks'],
        difficulty: 'Intermediate',
        relevance_score: 9,
        is_upskill: true
      },
      {
        id: 'mock-course-4',
        title: 'Node.js, Express, MongoDB & More: The Complete Bootcamp 2023',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '63 hours',
        rating: 4.8,
        skills: ['Node.js', 'Express', 'MongoDB', 'REST APIs'],
        difficulty: 'Intermediate',
        relevance_score: 8,
        is_upskill: true
      },
      {
        id: 'mock-course-5',
        title: 'Python for Data Science and Machine Learning Bootcamp',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '25 hours',
        rating: 4.6,
        skills: ['Python', 'Data Science', 'Machine Learning', 'Pandas'],
        difficulty: 'Intermediate',
        relevance_score: 7,
        is_upskill: true
      },
      {
        id: 'mock-course-6',
        title: 'AWS Certified Solutions Architect - Associate 2023',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/aws-certified-solutions-architect-associate/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '30 hours',
        rating: 4.5,
        skills: ['AWS', 'Cloud Computing', 'Architecture', 'DevOps'],
        difficulty: 'Advanced',
        relevance_score: 8,
        is_upskill: true
      },
      {
        id: 'mock-course-7',
        title: 'Docker and Kubernetes: The Complete Guide',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/docker-and-kubernetes-the-complete-guide/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '20 hours',
        rating: 4.7,
        skills: ['Docker', 'Kubernetes', 'DevOps', 'Containerization'],
        difficulty: 'Intermediate',
        relevance_score: 7,
        is_upskill: true
      },
      {
        id: 'mock-course-8',
        title: 'Complete SQL and Database Bootcamp 2023',
        provider: 'Udemy',
        url: 'https://www.udemy.com/course/complete-sql-database-bootcamp-zero-to-mastery/',
        thumbnail: 'https://img-c.udemycdn.com/course/750x422/1362070_b9a1_2.jpg',
        duration: '35 hours',
        rating: 4.6,
        skills: ['SQL', 'Database', 'PostgreSQL', 'Data Analysis'],
        difficulty: 'Beginner',
        relevance_score: 6,
        is_upskill: false
      },
      {
        id: 'mock-course-9',
        title: 'Git and GitHub - Complete Git Guide',
        provider: 'YouTube',
        url: 'https://www.youtube.com/watch?v=RGOj5yH7evk',
        thumbnail: 'https://img.youtube.com/vi/RGOj5yH7evk/maxresdefault.jpg',
        duration: '8 hours',
        rating: 4.8,
        skills: ['Git', 'GitHub', 'Version Control', 'Collaboration'],
        difficulty: 'Beginner',
        relevance_score: 9,
        is_upskill: false
      },
      {
        id: 'mock-course-10',
        title: 'System Design Interview - An Insider Guide',
        provider: 'YouTube',
        url: 'https://www.youtube.com/watch?v=ZgdS0OUmnzs',
        thumbnail: 'https://img.youtube.com/vi/ZgdS0OUmnzs/maxresdefault.jpg',
        duration: '12 hours',
        rating: 4.9,
        skills: ['System Design', 'Architecture', 'Scalability', 'Interview Prep'],
        difficulty: 'Advanced',
        relevance_score: 8,
        is_upskill: true
      }
    ];
  }

  /**
   * Fallback career tips
   */
  private getFallbackCareerTips(): AICareerTip[] {
    return [
      {
        id: 'fallback-tip-1',
        title: 'Continuous Learning',
        description: 'Stay updated with the latest technologies and best practices in your field.',
        category: 'Career Development',
        difficulty: 'Beginner',
        relevance_score: 5
      }
    ];
  }

  /**
   * Fallback courses (YouTube and Udemy only)
   */
  private getFallbackCourses(): AICourse[] {
    return [
      {
        id: 'fallback-course-1',
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
        id: 'fallback-course-2',
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
      }
    ];
  }
}

// Export singleton instance
export const aiService = new AIService();
