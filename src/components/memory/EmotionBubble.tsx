import React from 'react';
import { appleShade } from '../../pages/memory/palette';

type EmotionBubbleProps = {
  color?: string;
  className?: string;
  'aria-label'?: string;
};

const EmotionBubble: React.FC<EmotionBubbleProps> = ({ color = '#007aff', className = '', ...rest }) => (
  <div
    {...rest}
    className={`h-11 w-11 rounded-full shrink-0 relative ${className}`}
    style={{
      background: `linear-gradient(135deg, ${color} 0%, ${appleShade(color, -0.15)} 100%)`,
      boxShadow: `
        0 0 0 0.5px rgba(0,0,0,0.04),
        0 1px 2px rgba(0,0,0,0.06),
        0 8px 16px ${color}25,
        inset 0 0.5px 1px rgba(255,255,255,0.4)
      `,
    }}
  >
    <div
      className="absolute inset-1 rounded-full"
      style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, transparent 60%)' }}
    />
  </div>
);

export default EmotionBubble;
