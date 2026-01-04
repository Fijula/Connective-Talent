import { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Loader2, CheckCircle, AlertCircle, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface ParsedResumeData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  yearsExperience?: number;
  skills?: string[];
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  education?: string[];
  workExperience?: string[];
  certifications?: string[];
}

interface ResumeUploadProps {
  onParsedData: (data: ParsedResumeData) => void;
  onError: (error: string) => void;
  resumeFile?: File | null;
}

const ResumeUpload = ({ onParsedData, onError, resumeFile }: ResumeUploadProps) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const [parsingStatus, setParsingStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const [parsedData, setParsedData] = useState<ParsedResumeData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Use resumeFile prop if provided, otherwise use internal state
  const currentFile = resumeFile || uploadedFile;

  // Handle resumeFile prop changes
  useEffect(() => {
    if (resumeFile && resumeFile !== uploadedFile) {
      setUploadedFile(resumeFile);
      setParsingStatus('idle');
      setParsedData(null);
      setErrorMessage('');
    }
  }, [resumeFile]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    const nameLower = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || nameLower.endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || nameLower.endsWith('.txt');
    if (!isPdf && !isTxt) {
      onError('Please upload a PDF or TXT file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setParsingStatus('uploading');
    setIsUploading(true);
    setErrorMessage('');

    try {
      // Simulate file upload and AI parsing
      await parseResumeWithAI(file);
    } catch (error) {
      setParsingStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse resume');
      onError(errorMessage);
      setIsUploading(false);
    }
  };

  const parseResumeWithAI = async (file: File) => {
    setIsParsing(true);
    setParsingStatus('parsing');
    setParsingProgress(0);

    try {
      // Step 1: Extract text from resume
      setParsingProgress(25);
      const extractedText = await extractTextFromFile(file);
      
      // Step 2: Parse with AI
      setParsingProgress(50);
      const parsedData = await parseTextWithAI(extractedText);
      
      // Step 3: Format and structure data
      setParsingProgress(75);
      const formattedData = formatParsedData(parsedData);
      
      // Step 4: Complete
      setParsingProgress(100);
      setParsedData(formattedData);
      setParsingStatus('success');
      onParsedData(formattedData);
      
    } catch (error) {
      setParsingStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to parse resume');
      throw error;
    } finally {
      setIsUploading(false);
      setIsParsing(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    try {
      if (file.type === 'text/plain') {
        return await file.text();
      } else if (file.type === 'application/pdf') {
        return await extractTextFromPDF(file);
      } else {
        // Fallback by extension if browser didn't set type
        const nameLower = file.name.toLowerCase();
        if (nameLower.endsWith('.txt')) return await file.text();
        if (nameLower.endsWith('.pdf')) return await extractTextFromPDF(file);
        throw new Error('Unsupported file type. Please use a text file (.txt) or PDF file.');
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      throw error;
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      console.log('Starting PDF text extraction for file:', file.name);
      
      const arrayBuffer = await file.arrayBuffer();
      console.log('PDF file loaded, size:', arrayBuffer.byteLength, 'bytes');
      
      // Load PDF document with error handling
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0,
      });
      
      const pdf = await loadingTask.promise;
      console.log('PDF loaded successfully, pages:', pdf.numPages);
      
      let fullText = '';
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Extracting text from page ${i}/${pdf.numPages}`);
        
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Extract text more carefully
        const pageText = textContent.items
          .map((item: any) => {
            if (item && typeof item === 'object' && 'str' in item && item.str) {
              return item.str;
            }
            return '';
          })
          .filter(text => text && text.trim().length > 0)
          .join(' ');
        
        fullText += pageText + '\n';
        console.log(`Page ${i} text length:`, pageText.length);
      }
      
      console.log('Total extracted text length:', fullText.length);
      
      // If no selectable text found, fall back to OCR
      if (!fullText.trim()) {
        console.warn('No selectable text found, falling back to OCR...');
        const ocrText = await extractPdfTextWithOCR(arrayBuffer);
        if (!ocrText.trim()) {
          throw new Error('No text content found in PDF, including OCR. The PDF might be image-based or corrupted.');
        }
        return ocrText.trim();
      }
      return fullText.trim();
    } catch (error) {
      console.error('Error extracting text from PDF (pre-OCR):', error);
      // Final attempt: OCR entire PDF if loading worked but extraction failed
      try {
        const arrayBuffer = await file.arrayBuffer();
        const ocrText = await extractPdfTextWithOCR(arrayBuffer);
        if (ocrText.trim()) {
          return ocrText.trim();
        }
      } catch (ocrError) {
        console.error('OCR extraction also failed:', ocrError);
      }
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid PDF') || error.message.includes('invalid')) {
          throw new Error('Invalid PDF file. Please ensure the file is not corrupted.');
        } else if (error.message.includes('password')) {
          throw new Error('PDF is password-protected. Please remove the password and try again.');
        } else if (error.message.includes('No text content')) {
          throw new Error('No text content found in PDF. The PDF might be image-based. Please convert to text format.');
        }
      }
      
      throw new Error('Failed to extract text from PDF. Please try a different file or convert to text format.');
    }
  };

  const extractPdfTextWithOCR = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 });
    const pdf = await loadingTask.promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await (page as any).render({ canvasContext: context as any, viewport, canvas: canvas as any } as any).promise;
      const { data: { text: ocrPageText } } = await Tesseract.recognize(canvas, 'eng');
      text += ocrPageText + '\n';
    }
    return text;
  };

  const parseTextWithAI = async (text: string): Promise<any> => {
    try {
      // Check if OpenAI API key is available
      const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
      }

      // Detect OpenRouter vs OpenAI key and choose endpoint/model
      const isOpenRouter = openaiApiKey.startsWith('sk-or-');
      const endpoint = isOpenRouter
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      
      // Try different free models that are known to work
      const freeModels = [
        'openrouter/auto',
        'meta-llama/llama-3.2-3b-instruct:free',
        'google/gemma-2-2b-it:free',
        'microsoft/phi-3-mini-128k-instruct:free'
      ];
      const model = isOpenRouter ? freeModels[0] : 'gpt-3.5-turbo';

      // Call LLM: ask for a normalized structure and dynamic section handling
      const prompt = `Parse this resume and return ONLY valid JSON in this exact format:
{
  "firstName": "string",
  "lastName": "string", 
  "email": "string",
  "phone": "string",
  "location": "string",
  "yearsExperience": number,
  "skills": ["string"],
  "links": { "linkedin": "string", "github": "string", "portfolio": "string" },
  "sections": {
    "bioText": "string",
    "experience": [{"title": "string", "company": "string", "startDate": "string", "endDate": "string", "duration": "string", "description": "string"}],
    "education": ["string"],
    "certifications": ["string"]
  }
}

IMPORTANT: Return ONLY the JSON object. No explanations, no markdown, no code blocks. Just the raw JSON.

Resume:
${text.length > 3000 ? text.substring(0, 3000) + '...' : text}`;

      // Try different models if one fails
      let response;
      let lastError;
      
      for (let i = 0; i < (isOpenRouter ? freeModels.length : 1); i++) {
        const currentModel = isOpenRouter ? freeModels[i] : model;
        
        try {
          console.log(`Trying model: ${currentModel}`);
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
              ...(isOpenRouter ? { 'X-Title': 'Connectiv Talent' } : {}),
            },
            body: JSON.stringify({
              model: currentModel,
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert at parsing resumes and extracting structured information. Always return valid JSON.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.1,
              max_tokens: 500
            })
          });
          
          if (response.ok) {
            console.log(`Model ${currentModel} succeeded`);
            break; // Success, exit the loop
          }
          
          const errorData = await response.json();
          lastError = errorData;
          console.log(`Model ${currentModel} failed:`, errorData);
          
        } catch (error) {
          lastError = error;
          console.log(`Model ${currentModel} failed with error:`, error);
        }
      }

      if (!response || !response.ok) {
        let message = 'Failed to parse resume with AI';
        try {
          const errorData = lastError || (response ? await response.json() : null);
          console.error('LLM API error:', errorData);
          if (errorData?.error?.message) {
            message = errorData.error.message;
          } else if (errorData?.error?.type === 'insufficient_quota' || 
                     errorData?.error?.message?.includes('credit') ||
                     errorData?.error?.message?.includes('payment') ||
                     response?.status === 402 || response?.status === 429) {
            message = 'API quota exceeded. Please check your OpenRouter credits.';
          } else if (response?.status === 404) {
            message = 'No working models found. Please try again or contact support.';
          } else if (lastError) {
            message = `All models failed. Last error: ${lastError.message || 'Unknown error'}`;
          }
        } catch (_) {}
        if (response?.status === 401) {
          message = isOpenRouter ? 'Invalid OpenRouter API key.' : 'Invalid OpenAI API key.';
        }
        throw new Error(message);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response from AI');
      }

      // Clean and parse the JSON response
      let parsedData;
      let cleanedContent = content.trim();
      try {
        // Clean the content - remove any markdown formatting or extra text
        
        // Remove markdown code blocks if present
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Remove any text before the first {
        const jsonStart = cleanedContent.indexOf('{');
        if (jsonStart > 0) {
          cleanedContent = cleanedContent.substring(jsonStart);
        }
        
        // Remove any text after the last }
        const jsonEnd = cleanedContent.lastIndexOf('}');
        if (jsonEnd > 0 && jsonEnd < cleanedContent.length - 1) {
          cleanedContent = cleanedContent.substring(0, jsonEnd + 1);
        }
        
        console.log('Cleaned content for parsing:', cleanedContent);
        parsedData = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', parseError);
        console.error('Original content:', content);
        console.error('Cleaned content:', cleanedContent);
        throw new Error('Invalid response format from AI');
      }

      return parsedData;
    } catch (error) {
      console.error('Error parsing with AI:', error);
      throw error;
    }
  };

  const formatParsedData = (data: any): ParsedResumeData => {
    // Prefer the normalized structure from our new prompt
    const sections = data.sections || {};
    const links = data.links || {};

    const bioText = (sections.bioText || data.bio || '').toString();
    const experience = sections.experience || data.experience || data.work_experience || [];
    const education = sections.education || data.education || [];
    const certifications = sections.certifications || data.certifications || [];

    // Bio should ONLY contain summary-like content
    const normalizedBio = bioText.trim();

    return {
      firstName: data.firstName || data.name?.first || '',
      lastName: data.lastName || data.name?.last || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      yearsExperience: data.yearsExperience || data.experience_years || 0,
      skills: data.skills || [],
      bio: normalizedBio, // keep whitespace as-is; UI preserves line breaks
      linkedinUrl: data.linkedinUrl || links.linkedin || data.linkedin || '',
      githubUrl: data.githubUrl || links.github || data.github || '',
      portfolioUrl: data.portfolioUrl || links.portfolio || data.portfolio || '',
      education: education,
      workExperience: experience,
      certifications: certifications
    };
  };

  const removeFile = () => {
    if (!resumeFile) {
      setUploadedFile(null);
    }
    setParsedData(null);
    setParsingStatus('idle');
    setParsingProgress(0);
    setErrorMessage('');
  };


  const getStatusIcon = () => {
    switch (parsingStatus) {
      case 'uploading':
      case 'parsing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Brain className="w-5 h-5 text-primary" />;
    }
  };

  const getStatusText = () => {
    switch (parsingStatus) {
      case 'uploading':
        return 'Uploading resume...';
      case 'parsing':
        return 'AI is parsing your resume...';
      case 'success':
        return 'Resume parsed successfully!';
      case 'error':
        return 'Failed to parse resume';
      default:
        return 'Ready to parse resume';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Resume Upload & AI Parsing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/60 transition-colors">
            <input
              ref={inputRef}
              type="file"
              accept=".txt,.pdf"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
              disabled={isUploading || isParsing}
            />
            
            <div className="space-y-4">
              <FileText className="w-12 h-12 text-primary mx-auto" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Upload your resume for AI parsing
                </p>
                <p className="text-xs text-muted-foreground">
                  TXT, PDF • Max 10MB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading || isParsing}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Resume
              </Button>
            </div>
          </div>

          {/* Uploaded File */}
          {currentFile && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{currentFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(currentFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={isUploading || isParsing}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Parsing Status */}
          {(isUploading || isParsing || parsingStatus === 'success' || parsingStatus === 'error') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm font-medium">{getStatusText()}</span>
              </div>
              
              {(isUploading || isParsing) && (
                <Progress value={parsingProgress} className="w-full" />
              )}
              
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* Parsed Data Preview */}
          {parsedData && parsingStatus === 'success' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">Parsed successfully!</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {parsedData.firstName} {parsedData.lastName}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {parsedData.email}
                </div>
                <div>
                  <span className="font-medium">Experience:</span> {parsedData.yearsExperience} years
                </div>
                <div>
                  <span className="font-medium">Skills:</span> {parsedData.skills?.length || 0} detected
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {parsedData.skills?.slice(0, 8).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {parsedData.skills && parsedData.skills.length > 8 && (
                  <Badge variant="outline" className="text-xs">
                    +{parsedData.skills.length - 8} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResumeUpload;
