import { cn } from '@/lib/utils';

interface BrandMarkProps {
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'h-9 w-9',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
} as const;

const labelClasses = {
    sm: {
        title: 'text-base',
        subtitle: 'text-xs',
    },
    md: {
        title: 'text-xl',
        subtitle: 'text-sm',
    },
    lg: {
        title: 'text-xl',
        subtitle: 'text-sm',
    },
} as const;

export function BrandMark({ size = 'md', showLabel = false, className }: BrandMarkProps) {
    return (
        <div className={cn('flex items-center gap-3', className)}>
            <div className={cn('overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-primary/10', sizeClasses[size])}>
                <img src="/pwa-icon-192.png" alt="InOutHub" className="h-full w-full object-cover" />
            </div>
            {showLabel ? (
                <div className="min-w-0">
                    <p className={cn('truncate font-black tracking-tight text-foreground', labelClasses[size].title)}>InOutHub</p>
                    <p className={cn('truncate font-medium text-muted-foreground', labelClasses[size].subtitle)}>Events</p>
                </div>
            ) : null}
        </div>
    );
}
