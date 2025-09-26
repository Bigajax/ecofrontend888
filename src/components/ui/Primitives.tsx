import React, { forwardRef } from 'react';
import clsx from 'clsx';

type SurfaceCardProps = React.HTMLAttributes<HTMLDivElement>;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'subtle';
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

type ToolbarProps = React.HTMLAttributes<HTMLElement>;

type ChipProps = React.HTMLAttributes<HTMLSpanElement> & {
  active?: boolean;
};

export const SurfaceCard = forwardRef<HTMLDivElement, SurfaceCardProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={clsx('surface-card', className)} {...props} />
  )
);
SurfaceCard.displayName = 'SurfaceCard';

export const GlassToolbar = forwardRef<HTMLElement, ToolbarProps>(
  ({ className, ...props }, ref) => (
    <header
      ref={ref}
      className={clsx('surface-toolbar', className)}
      {...props}
    />
  )
);
GlassToolbar.displayName = 'GlassToolbar';

export const GlassButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', disabled, ...props }, ref) => (
    <button
      ref={ref}
      data-variant={variant}
      className={clsx(
        'surface-button',
        variant === 'subtle' && 'surface-button--subtle',
        disabled && 'surface-button--disabled',
        className
      )}
      disabled={disabled}
      {...props}
    />
  )
);
GlassButton.displayName = 'GlassButton';

export const InputField = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={clsx('surface-input', className)} {...props} />
  )
);
InputField.displayName = 'InputField';

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(
  ({ className, active = false, ...props }, ref) => (
    <span
      ref={ref}
      data-active={active ? 'true' : undefined}
      className={clsx('surface-chip', active && 'surface-chip--active', className)}
      {...props}
    />
  )
);
Chip.displayName = 'Chip';

