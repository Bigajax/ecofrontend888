// src/components/PhoneFrame.tsx
import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PhoneFrameProps {
  children: ReactNode;
  className?: string;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({ children, className }) => {
  return (
    // fundo branco para dar suporte ao glass dos filhos
    <div className="flex items-center justify-center min-h-[100svh] bg-white">
      <motion.div
        className={[
          'relative w-full h-[calc(100svh-2rem)] max-w-sm',
          'rounded-3xl shadow-xl',        // “bezel” do frame
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
