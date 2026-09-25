import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'tonal' | 'outline' | 'ghost' | 'danger' | 'neutral';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:opacity-90 disabled:opacity-50',
  tonal: 'bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 disabled:opacity-50',
  outline:
    'border border-outline-variant/30 text-on-surface hover:bg-outline-variant/10 disabled:opacity-50',
  ghost: 'text-on-surface-variant hover:bg-outline-variant/10 disabled:opacity-50',
  danger: 'bg-error text-on-error hover:opacity-90 disabled:opacity-50',
  neutral:
    'bg-surface-container-high text-on-surface-variant border border-outline-variant/20 hover:bg-surface-dim disabled:opacity-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-bold font-headline uppercase tracking-wider',
  md: 'px-4 py-2 text-sm font-medium',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
