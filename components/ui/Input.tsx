'use client';

import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'subtle';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'border border-[var(--border-default)] focus:border-[var(--primary)]',
      subtle: 'border-b-2 border-[var(--border-default)] focus:border-b-[var(--primary)]',
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-[var(--space-2)]">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={clsx(
              'w-full px-[var(--space-3)] py-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--surface-base)] text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all duration-[var(--transition-sm)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20',
              variantStyles[variant],
              error && 'border-[var(--danger)] focus:border-[var(--danger)]',
              icon && 'pl-10',
              className
            )}
            {...props}
          />
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {icon}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-[var(--danger)] mt-[var(--space-1)]">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-[var(--text-muted)] mt-[var(--space-1)]">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
