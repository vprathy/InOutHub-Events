import { cn } from '@/lib/utils';

interface BrandMarkProps {
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: 'h-9 w-9',
    md: 'h-11 w-11',
    lg: 'h-20 w-20',
} as const;

export function BrandMark({ size = 'md', showLabel = false, className }: BrandMarkProps) {
    return (
        <div className={cn('flex items-center gap-3', className)}>
            <div className={cn('overflow-hidden rounded-2xl bg-primary/10 ring-1 ring-primary/10', sizeClasses[size])}>
                <img src="/pwa-icon-192.png" alt="InOutHub" className="h-full w-full object-cover" />
            </div>
            {showLabel ? (
                <div className="min-w-0">
                    <p className="truncate text-lg font-black tracking-tight text-foreground">InOutHub</p>
                    <p className="truncate text-sm font-medium text-muted-foreground">Events</p>
                </div>
            ) : null}
        </div>
    );
}
