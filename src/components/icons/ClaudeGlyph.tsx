import React from 'react';

export interface ClaudeGlyphProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  active?: boolean;
}

const ClaudeGlyph: React.FC<ClaudeGlyphProps> = ({ size = 24, active = false, className, ...rest }) => {
  const combinedClassName = ['transition-transform duration-200', className].filter(Boolean).join(' ');

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={combinedClassName}
      {...rest}
    >
      <path
        d="M4.8 12c0-4.57 3.52-8.4 8.24-8.4 2.48 0 4.52.92 6.04 2.64"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.28 9.4c.59 1.07.9 2.32.9 3.6 0 4.57-3.52 8.4-8.24 8.4-2.48 0-4.53-.92-6.04-2.64"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={12}
        cy={12}
        r={3.1}
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.4}
        opacity={active ? 1 : 0.9}
      />
    </svg>
  );
};

export default ClaudeGlyph;
