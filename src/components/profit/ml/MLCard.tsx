import { HTMLAttributes } from 'react';

export function MLCard({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-xl border border-border bg-card ${className}`} {...rest}>
      {children}
    </div>
  );
}
