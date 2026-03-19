'use client';

import React from 'react';
import clsx from 'clsx';

interface KPIProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  actions?: React.ReactNode;
}

export const KPI = React.forwardRef<HTMLDivElement, KPIProps>(
  ({ className, title, value, icon, trend, subtitle, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'p-[var(--space-5)] rounded-[var(--radius-lg)] bg-[var(--surface-elevated)] border border-[var(--border-default)] transition-all duration-[var(--transition-md)] hover:border-[var(--border-hover)] hover:shadow-[var(--elevation-2)]',
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-[var(--space-4)]">
        <div className="flex-1">
          <p className="text-xs uppercase font-semibold tracking-wide text-[var(--text-muted)] mb-[var(--space-1)]">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
        {icon && (
          <div className="ml-3 p-[var(--space-2)] rounded-[var(--radius-md)] bg-[var(--primary-muted)] text-[var(--primary)]">
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-[var(--space-2)] mb-[var(--space-4)]">
        <span className="text-3xl font-bold text-[var(--text-primary)]">
          {value}
        </span>
        {trend && (
          <span
            className={clsx(
              'text-sm font-semibold',
              trend.isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
            )}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>

      {/* Actions */}
      {actions && <div>{actions}</div>}
    </div>
  )
);

KPI.displayName = 'KPI';
