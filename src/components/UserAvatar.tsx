import { cn } from '@/lib/utils';

interface UserAvatarProps {
  displayName?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-2xl',
};

export function UserAvatar({ displayName, email, size = 'md', className }: UserAvatarProps) {
  const initial = (displayName?.[0] || email?.[0] || '?').toUpperCase();

  return (
    <div
      className={cn(
        'rounded-full bg-[#F97316] flex items-center justify-center text-white font-bold select-none shrink-0',
        sizeClasses[size],
        className
      )}
    >
      {initial}
    </div>
  );
}
