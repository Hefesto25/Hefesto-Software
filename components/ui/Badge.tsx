'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-[var(--space-3)] py-[var(--space-1)] rounded-[var(--radius-full)] text-xs font-medium transition-all duration-[var(--transition-sm)] border',
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-default)]',
        primary: 'bg-[var(--primary-muted)] text-[var(--primary)] border-[var(--primary-border)]',
        success: 'bg-[var(--success-muted)] text-[var(--success)] border-[var(--success-border)]',
        danger: 'bg-[var(--danger-muted)] text-[var(--danger)] border-[var(--danger-border)]',
        warning: 'bg-[var(--warning-muted)] text-[var(--warning)] border-[var(--warning-border)]',
        secondary: 'bg-[var(--secondary-muted)] text-[var(--secondary)] border-[var(--secondary-muted)]',
      },
      size: {
        xs: 'text-xs px-[var(--space-2)] py-0.5',
        sm: 'text-sm px-[var(--space-3)] py-1',
        md: 'text-base px-[var(--space-4)] py-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  onRemove?: () => void;
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, icon, onRemove, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1">{children}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="flex-shrink-0 ml-1 hover:opacity-70 transition-opacity"
          aria-label="Remove"
        >
          ✕
        </button>
      )}
    </div>
  )
);

Badge.displayName = 'Badge';
