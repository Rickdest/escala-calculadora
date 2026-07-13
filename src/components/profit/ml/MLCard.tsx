import { HTMLAttributes } from 'react';

export function MLCard({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-sm ${className}`} {...rest}>
      {children}
    </div>
  );
}
