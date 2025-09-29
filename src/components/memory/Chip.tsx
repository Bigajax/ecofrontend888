import React from 'react';
import { appleTagColor } from '../../pages/memory/palette';

type ChipProps = React.PropsWithChildren<{
  title?: string;
  variant?: 'default' | 'colorful';
  seedColor?: string;
}>;

const Chip: React.FC<ChipProps> = ({ title, children, variant = 'default', seedColor }) => {
  if (variant === 'colorful' && seedColor) {
    const colors = appleTagColor(seedColor);
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] leading-4 font-medium max-w-full"
        style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
      >
        {title ? <span className="opacity-70">{title}:</span> : null}
        <span className="truncate">{children}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-black/[0.06] bg-white/90 backdrop-blur-sm text-[12px] leading-4 text-gray-600 max-w-full">
      {title ? <span className="font-medium text-gray-800">{title}:</span> : null}
      <span className="truncate">{children}</span>
    </div>
  );
};

export default Chip;
