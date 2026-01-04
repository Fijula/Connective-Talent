import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ImageBasedAvatarProps {
  isVisible: boolean;
  onComplete?: () => void;
  currentStep?: number;
  totalSteps?: number;
  imageUrl?: string; // URL to Naruto image
}

interface WalkthroughStep {
  id: number;
  title: string;
  description: string;
  speechText: string;
}

const walkthroughSteps: WalkthroughStep[] = [
  {
    id: 1,
    title: "Welcome to ConnectivTalent! 👋",
    description: "I'm your AI assistant, here to help you navigate our talent management platform. Let me show you around!",
    speechText: "Hey there! I'm your ninja guide for ConnectivTalent! I'll help you master this talent management platform. Believe it! Let's start this journey together and discover all the amazing features we have for you."
  },
  {
    id: 2,
    title: "Talent Pool Management 👥",
    description: "Here you can view and manage all your talent profiles. Add new prospects, track existing employees, and monitor their availability status.",
    speechText: "Welcome to the Talent Pool! This is where all the magic happens. You can view all your talented ninjas, add new prospects who want to join your team, and keep track of your existing employees' availability. It's like having your own ninja village roster!"
  },
  {
    id: 3,
    title: "AI-Powered Matching 🎯",
    description: "Use our advanced AI matching system to find the perfect talent for opportunities. Try the voice assistant for hands-free searching!",
    speechText: "Now this is where things get really exciting! Our AI matching system is like having a super-smart ninja advisor. It can find the perfect talent for any opportunity using advanced algorithms. And guess what? You can even use voice commands to search hands-free! Pretty cool, right?"
  },
  {
    id: 4,
    title: "Voice Commands 🎤",
    description: "Speak naturally to find talent or opportunities. Try saying 'Find React developers' or 'Show QA opportunities' - it's that easy!",
    speechText: "Voice commands are the future! Just speak naturally and I'll help you find what you need. Try saying things like 'Find React developers' or 'Show me QA opportunities'. It's like having a conversation with your ninja assistant - no typing required!"
  },
  {
    id: 5,
    title: "Opportunity Management 💼",
    description: "Create and manage job opportunities, track fulfillment status, and match them with the best available talent.",
    speechText: "Opportunity Management is where you create and track all your job openings. You can see which positions are filled, which are still open, and match them with the best available talent. It's like being the mission coordinator for your ninja squad!"
  },
  {
    id: 6,
    title: "Profile Management 👤",
    description: "Add new talent profiles, upload resumes, manage skills, and track project assignments for existing employees.",
    speechText: "Profile Management is your personal ninja database! Here you can add new talent profiles, upload their resumes, manage their skills, and track their project assignments. It's like having a detailed file on every ninja in your village. You're all set to become a talent management master!"
  }
];

const ImageBasedAvatar: React.FC<ImageBasedAvatarProps> = ({
  isVisible,
  onComplete,
  currentStep = 1,
  totalSteps = 6,
  imageUrl = "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop&crop=face" // Default placeholder
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isTalking, setIsTalking] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.8);
  const [speechPitch, setSpeechPitch] = useState(1.2);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const currentStepData = walkthroughSteps[currentStep - 1];

  // Speech synthesis setup
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser');
      return;
    }

    // Cancel any ongoing speech when step changes
    if (speechRef.current) {
      speechSynthesis.cancel();
    }

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
      setIsTalking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsTalking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsTalking(false);
    };

    speechRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsTalking(false);
    }
  };

  const toggleSpeech = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (currentStepData) {
      speakText(currentStepData.speechText);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center relative">
      {/* 3D Image Avatar Container */}
      <motion.div
        className="relative"
        animate={{
          y: [0, -15, 0],
          rotateY: [0, 8, 0],
          scale: isSpeaking ? [1, 1.05, 1] : 1,
        }}
        transition={{
          y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 5, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 0.5, ease: "easeInOut" }
        }}
        style={{
          transformStyle: 'preserve-3d',
          filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.4))'
        }}
      >
        {/* Avatar Image with 3D Effects */}
        <div className="relative">
          {/* Glow effect when speaking */}
          {isSpeaking && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
                filter: 'blur(20px)',
                zIndex: -1
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}

          {/* Main Avatar Image */}
          <motion.div
            className="relative w-32 h-32 rounded-full overflow-hidden"
            style={{
              transform: 'perspective(1000px) rotateX(5deg)',
              boxShadow: 'inset 0 0 20px rgba(255,255,255,0.2), 0 0 40px rgba(0,0,0,0.3)'
            }}
            animate={{
              rotateX: isSpeaking ? [5, 8, 5] : 5,
            }}
            transition={{
              duration: 0.8,
              ease: "easeInOut"
            }}
          >
            <img
              src={imageUrl}
              alt="Naruto Avatar"
              className="w-full h-full object-cover"
              style={{
                filter: 'contrast(1.1) brightness(1.05) saturate(1.1)',
                transform: 'translateZ(20px)'
              }}
            />

            {/* Talking animation overlay */}
            {isTalking && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent"
                animate={{
                  y: [-100, 100],
                  opacity: [0, 0.3, 0],
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)'
                }}
              />
            )}
          </motion.div>

          {/* Floating particles around avatar */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                style={{
                  left: `${20 + (i * 10)}%`,
                  top: `${30 + (i % 3) * 20}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.4, 1, 0.4],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2 + (i * 0.2),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>
        </div>

        {/* Step-based Effects */}
        {currentStep === 1 && (
          <motion.div
            className="absolute -top-8 -right-6 w-4 h-4 bg-yellow-400 rounded-full"
            animate={{
              scale: [1, 2, 1],
              opacity: [0.6, 1, 0.6],
              rotate: [0, 360],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              filter: 'drop-shadow(0 0 12px rgba(255, 193, 7, 0.8))'
            }}
          />
        )}

        {currentStep === 3 && (
          <>
            {/* Chakra aura effect */}
            <motion.div
              className="absolute -top-10 -right-8 w-6 h-6 bg-purple-400 rounded-full"
              animate={{
                scale: [1, 2.5, 1],
                opacity: [0.3, 0.7, 0.3],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                filter: 'drop-shadow(0 0 15px rgba(168, 85, 247, 0.9))'
              }}
            />
            <motion.div
              className="absolute top-4 -left-10 w-4 h-4 bg-blue-400 rounded-full"
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.5, 1, 0.5],
                x: [0, 10, 0],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5
              }}
              style={{
                filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))'
              }}
            />
          </>
        )}

        {currentStep === 6 && (
          <>
            {/* Celebration effects */}
            <motion.div
              className="absolute -top-10 -right-8 w-4 h-4 bg-pink-400 rounded-full"
              animate={{
                scale: [1, 2, 1],
                opacity: [0.5, 1, 0.5],
                rotate: [0, 360],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                filter: 'drop-shadow(0 0 12px rgba(236, 72, 153, 0.9))'
              }}
            />
            <motion.div
              className="absolute top-4 -left-10 w-3 h-3 bg-pink-400 rounded-full"
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.6, 1, 0.6],
                y: [0, -15, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.3
              }}
              style={{
                filter: 'drop-shadow(0 0 8px rgba(236, 72, 153, 0.8))'
              }}
            />
          </>
        )}
      </motion.div>

      {/* Speech Controls */}
      <div className="mt-6 flex items-center space-x-4">
        <motion.button
          onClick={toggleSpeech}
          className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
            isSpeaking 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isSpeaking ? '🔇 Stop' : '🔊 Listen'}
        </motion.button>

        {/* Speech Settings */}
        <div className="flex items-center space-x-2 text-sm">
          <label className="text-gray-600">Speed:</label>
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={speechRate}
            onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
            className="w-16"
          />
          <span className="text-gray-600 w-8">{speechRate.toFixed(1)}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm">
          <label className="text-gray-600">Pitch:</label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speechPitch}
            onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
            className="w-16"
          />
          <span className="text-gray-600 w-8">{speechPitch.toFixed(1)}</span>
        </div>
      </div>

      {/* Current Step Display */}
      <motion.div 
        className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full font-semibold shadow-lg"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        Step {currentStep} of {totalSteps} - {currentStepData?.title}
      </motion.div>
    </div>
  );
};

export default ImageBasedAvatar;
