import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';

interface WalkthroughStep {
  title: string;
  description: string;
  speechText: string;
  highlight?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
}

interface AppWalkthroughProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const AppWalkthrough: React.FC<AppWalkthroughProps> = ({
  isVisible,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.8);
  const [speechPitch, setSpeechPitch] = useState(1.2);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const walkthroughSteps: WalkthroughStep[] = [
    {
      title: "Welcome to ConnectivTalent! 👋",
      description: "I'm your AI assistant, here to help you navigate our talent management platform. Let me show you around!",
      speechText: "Hey there! I'm your ninja guide for ConnectivTalent! I'll help you master this talent management platform. Let's start this journey together and discover all the amazing features we have for you."
    },
    {
      title: "Talent Pool Management 👥",
      description: "Browse and review existing talent, opportunities, and view analytics. Search, filter, and monitor your talent database with comprehensive insights and status tracking.",
      speechText: "Welcome to the Talent Pool! This is your comprehensive dashboard where you can browse all your existing talent, review current opportunities, and view detailed analytics. Think of it as your ninja village headquarters where you can see everyone's status, track mission progress, and get insights into your talent pool performance!"
    },
    {
      title: "Talent Management 👤",
      description: "Create new talent profiles, upload resumes, manage skills, and handle administrative tasks for your talent database.",
      speechText: "Talent Management is where you build your ninja army! Here you can add new talent profiles, upload their resumes, manage their skills, and handle all the administrative tasks. It's like recruiting new ninjas and setting up their training files."
    },
    {
      title: "Opportunity Management 💼",
      description: "Create and manage job opportunities, track fulfillment status, and match them with the best available talent.",
      speechText: "Opportunity Management is where you create and track all your job openings. You can see which positions are filled, which are still open, and match them with the best available talent. It's like being the mission coordinator for your ninja squad!"
    },
    {
      title: "AI-Powered Matching 🎯",
      description: "Use our advanced AI matching system to find the perfect talent for opportunities. Try the voice assistant for hands-free searching!",
      speechText: "Now this is where things get really exciting! Our AI matching system is like having a super-smart ninja advisor. It can find the perfect talent for any opportunity using advanced algorithms. Pretty cool, right?"
    },
    {
      title: "Voice Commands 🎤",
      description: "Speak naturally to find talent or opportunities. Try saying 'Find React developers' or 'Show QA opportunities' - it's that easy!",
      speechText: "Voice commands are the future! Just speak naturally and I'll help you find what you need. Try saying things like 'Find React developers' or 'Show me QA opportunities'. It's like having a conversation with your ninja assistant - no typing required! You're all set to become a talent management master!"
    }
  ];

  const currentStepData = walkthroughSteps[currentStep];

  // Auto-play speech when step changes
  useEffect(() => {
    if (isVisible && currentStepData) {
      speakText(currentStepData.speechText);
    }
  }, [currentStep, isVisible]);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    // Cancel any existing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configure speech
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = 0.8;

    // Try to use a more natural voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.name.includes('Google') || 
      voice.name.includes('Microsoft') ||
      voice.name.includes('Samantha') ||
      voice.name.includes('Alex')
    );
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    speechRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (currentStepData) {
      speakText(currentStepData.speechText);
    }
  };

  const handleNext = () => {
    console.log('Next button clicked');
    if (currentStep < walkthroughSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    console.log('Previous button clicked');
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    console.log('Complete button clicked');
    stopSpeaking();
    onComplete();
  };

  const handleSkip = () => {
    console.log('Skip button clicked');
    stopSpeaking();
    onSkip();
  };

  const getStepPosition = (position: string) => {
    switch (position) {
      case 'top':
        return { top: '10%', left: '50%', transform: 'translateX(-50%)' };
      case 'bottom':
        return { bottom: '10%', left: '50%', transform: 'translateX(-50%)' };
      case 'left':
        return { top: '50%', left: '10%', transform: 'translateY(-50%)' };
      case 'right':
        return { top: '50%', right: '10%', transform: 'translateY(-50%)' };
      default:
        return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background overlay */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ pointerEvents: 'none' }}
      />

      {/* Centered Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <motion.div
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4"
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Header with bluish gradient */}
          <div className="relative bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {currentStepData.title.split(' ')[0] === 'Welcome' ? '👋' : 
                   currentStepData.title.includes('Talent') ? '👥' :
                   currentStepData.title.includes('AI') ? '🎯' :
                   currentStepData.title.includes('Voice') ? '🎤' :
                   currentStepData.title.includes('Opportunity') ? '💼' : '👤'}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{currentStepData.title}</h2>
                  <p className="text-blue-100 text-sm">Step {currentStep + 1} of {walkthroughSteps.length}</p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 text-base leading-relaxed mb-6">
              {currentStepData.description}
            </p>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Progress</span>
                <span className="text-sm font-medium text-gray-600">
                  {Math.round(((currentStep + 1) / walkthroughSteps.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentStep + 1) / walkthroughSteps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Voice Controls */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-blue-800">Voice Explanation</h3>
                <motion.button
                  onClick={toggleSpeech}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                    isSpeaking 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isSpeaking ? '🔇 Stop' : '🔊 Listen'}
                </motion.button>
              </div>

              {/* Speech Settings */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <label className="text-xs text-blue-700 font-medium w-12">Speed:</label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={speechRate}
                    onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-blue-600 w-8">{speechRate.toFixed(1)}</span>
                </div>

                <div className="flex items-center space-x-3">
                  <label className="text-xs text-blue-700 font-medium w-12">Pitch:</label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speechPitch}
                    onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-blue-600 w-8">{speechPitch.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Previous button clicked - event:', e);
                  handlePrevious();
                }}
                disabled={currentStep === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  currentStep === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Next button clicked - event:', e);
                  handleNext();
                }}
                className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
              >
                <span>{currentStep === walkthroughSteps.length - 1 ? 'Get Started' : 'Next'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AppWalkthrough;