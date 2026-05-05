import React from 'react';

interface ButtonEcoProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export function ButtonEco({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  fullWidth,
  className = '',
  type = 'button',
}: ButtonEcoProps) {
  const heights: Record<string, string> = {
    sm: 'h-9 text-sm px-4',
    md: 'h-[52px] text-[15px] px-6',
    lg: 'h-14 text-base px-8',
  };

  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--accent-dark)',
      border: 'none',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--accent)',
      border: '1.5px solid var(--accent)',
    },
    ghost: {
      background: 'var(--neutral-hover)',
      color: 'var(--text-primary)',
      border: 'none',
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={styles[variant]}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium rounded-full',
        'transition-all duration-200 active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        heights[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  );
}
