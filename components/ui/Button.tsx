'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const buttonVariants = cva(
  /* base styles */
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-[var(--transition-sm)] rounded-[var(--radius-md)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed will-change-transform active:scale-95',
  {
    variants: {
      variant: {
        /* Primary - Main action button */
        primary:
          'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] shadow-md hover:shadow-lg',

        /* Secondary - Alternative action */
        secondary:
          'bg-[var(--secondary)] text-white hover:bg-[var(--secondary-hover)] active:bg-[var(--secondary-hover)] shadow-sm hover:shadow-md',

        /* Ghost - Minimal style */
        ghost:
          'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-default)] hover:border-[var(--border-hover)]',

        /* Outline - Bordered style */
        outline:
          'border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-muted)] active:bg-[var(--primary)]  active:text-white',

        /* Success - Positive action */
        success:
          'bg-[var(--success)] text-white hover:bg-[var(--success-hover)] active:scale-95 shadow-md hover:shadow-lg',

        /* Danger - Destructive action */
        danger:
          'bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)] active:scale-95 shadow-md hover:shadow-lg',

        /* Warning - Caution action */
        warning:
          'bg-[var(--warning)] text-white hover:bg-[var(--warning-hover)] active:scale-95 shadow-md hover:shadow-lg',

        /* Subtle - Light background */
        subtle:
          'bg-[var(--primary-muted)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white',
      },
      size: {
        xs: 'px-[var(--space-2)] py-[var(--space-1)] text-xs gap-1',
        sm: 'px-[var(--space-3)] py-[var(--space-2)] text-sm',
        md: 'px-[var(--space-4)] py-[var(--space-2)] text-base',
        lg: 'px-[var(--space-5)] py-[var(--space-3)] text-lg',
        xl: 'px-[var(--space-6)] py-[var(--space-4)] text-lg',
        icon: 'p-[var(--space-2)] text-lg',
        icon-lg: 'p-[var(--space-3)] text-xl',
      },
      fullWidth: {
        true: 'w-full',
      },
      loading: {
        true: 'pointer-events-none',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading,
      loading,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading || loading;

    return (
      <button
        ref={ref}
        className={clsx(
          buttonVariants({ variant, size, fullWidth, loading: isLoading || loading }),
          className
        )}
        disabled={isDisabled}
        {...props}
      >
        {(isLoading || loading) && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && !loading && leftIcon && <span>{leftIcon}</span>}
        {children}
        {!isLoading && !loading && rightIcon && <span>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
