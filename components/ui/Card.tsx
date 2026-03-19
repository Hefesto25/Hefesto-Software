'use client';

import React from 'react';
import clsx from 'clsx';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline' | 'glass';
  hover?: boolean;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, interactive = false, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-[var(--surface-base)] border border-[var(--border-default)]',
      elevated: 'bg-[var(--surface-elevated)] border border-[var(--border-default)] shadow-[var(--elevation-2)]',
      outline: 'bg-[var(--bg-primary)] border-2 border-[var(--border-default)]',
      glass: 'bg-[var(--surface-glass)] border border-[var(--border-default)] backdrop-blur-sm',
    };

    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-[var(--radius-lg)] transition-all duration-[var(--transition-md)]',
          variantStyles[variant],
          hover && 'hover:shadow-[var(--elevation-3)] hover:border-[var(--border-hover)]',
          interactive && 'cursor-pointer hover:bg-[var(--bg-hover)]',
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('p-[var(--space-5)] border-b border-[var(--border-default)]', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx('p-[var(--space-5)]', className)}
      {...props}
    />
  )
);

CardBody.displayName = 'CardBody';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'px-[var(--space-5)] py-[var(--space-4)] border-t border-[var(--border-default)] flex items-center justify-between',
        className
      )}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';
