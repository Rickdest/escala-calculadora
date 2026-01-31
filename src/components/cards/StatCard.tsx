import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  suffix,
  variant = 'default',
  className 
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-card',
    primary: 'stat-card-primary',
    success: 'stat-card-success',
    warning: 'bg-warning-muted',
    danger: 'bg-danger-muted',
  };

  const textStyles = {
    default: 'text-foreground',
    primary: 'text-primary-foreground',
    success: 'text-success-foreground',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  const iconBgStyles = {
    default: 'bg-primary/10',
    primary: 'bg-primary-foreground/20',
    success: 'bg-success-foreground/20',
    warning: 'bg-warning/20',
    danger: 'bg-danger/20',
  };

  const iconStyles = {
    default: 'text-primary',
    primary: 'text-primary-foreground',
    success: 'text-success-foreground',
    warning: 'text-warning',
    danger: 'text-danger',
  };

  return (
    <div className={cn('stat-card', variantStyles[variant], className)}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-xl', iconBgStyles[variant])}>
          <Icon className={cn('w-5 h-5', iconStyles[variant])} />
        </div>
      </div>
      
      <div className="mt-4">
        <p className={cn(
          'text-sm font-medium opacity-80',
          variant === 'default' ? 'text-muted-foreground' : textStyles[variant]
        )}>
          {label}
        </p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className={cn('number-highlight', textStyles[variant])}>
            {value}
          </span>
          {suffix && (
            <span className={cn(
              'text-lg font-semibold opacity-70',
              textStyles[variant]
            )}>
              {suffix}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
