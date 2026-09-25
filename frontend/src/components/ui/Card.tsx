import type { HTMLAttributes, ReactNode } from 'react';

export type CardVariant = 'solid' | 'glass';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Tratamiento de superficie. `glass` = fondo translúcido + blur. */
  variant?: CardVariant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  solid: 'bg-surface-container-lowest border border-outline-variant/20',
  glass: 'bg-surface-container-lowest/70 backdrop-blur-md border border-outline-variant/10',
};

export function Card({ variant = 'solid', className = '', children, ...rest }: CardProps) {
  return (
    <div className={`rounded-xl shadow-sm ${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
