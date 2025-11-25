// src/components/PhoneFrame.tsx
import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
  backgroundImage?: string;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({ children, className, backgroundImage }) => {
  return (
    // fundo com imagem de background opcional
    <div
      className="flex items-center justify-center min-h-[100svh]"
      style={
        backgroundImage
          ? {
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: '100%',
              backgroundPosition: 'center 45%',
              backgroundRepeat: 'no-repeat',
            }
          : { backgroundColor: 'white' }
      }
    >
      <motion.div
        className={[
          'relative w-full h-[calc(100svh-2rem)] max-w-sm',
          'rounded-3xl',        // “bezel” do frame
          'flex flex-col bg-transparent',  // sem bg opaco aqui
          // IMPORTANTE: sem overflow-hidden, para não cortar sombras/popup
          className || '',
        ].join(' ')}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PhoneFrame;
