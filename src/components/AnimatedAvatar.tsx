import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ImageBasedAvatar from './ImageBasedAvatar';

interface AnimatedAvatarProps {
  isVisible: boolean;
  onComplete?: () => void;
  currentStep?: number;
  totalSteps?: number;
  imageUrl?: string; // URL to Naruto image
}


const AnimatedAvatar: React.FC<AnimatedAvatarProps> = ({
  isVisible,
  onComplete,
  currentStep = 1,
  totalSteps = 4,
  imageUrl
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
    }
  }, [isVisible]);

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative w-full h-full max-w-4xl max-h-3xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: isVisible ? 1 : 0.8, opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="w-full h-full flex items-center justify-center relative pointer-events-none">
          {/* Image-Based Avatar with Speech */}
          <ImageBasedAvatar
            isVisible={isVisible}
            currentStep={currentStep}
            totalSteps={totalSteps}
            imageUrl={imageUrl}
          />
        </div>
        
        {/* Avatar-only overlay - no duplicate UI */}
      </motion.div>
    </motion.div>
  );
};

export default AnimatedAvatar;
