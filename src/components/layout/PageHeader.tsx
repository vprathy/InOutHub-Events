import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    status?: ReactNode;
    align?: 'left' | 'center';
    density?: 'default' | 'compact';
}

export function PageHeader({
    title,
    subtitle,
    actions,
    status,
    align = 'left',
    density = 'default',
}: PageHeaderProps) {
    const isCentered = align === 'center';
    const isCompact = density === 'compact';
    const wrapperClassName = `${isCompact ? 'space-y-1.5' : 'space-y-2'} ${isCentered ? 'text-center' : ''}`;
    const layoutClassName = `flex flex-col ${isCompact ? 'gap-1.5' : 'gap-2'} ${isCentered ? 'items-center' : 'sm:flex-row sm:items-end sm:justify-between'}`;

    return (
        <div className={wrapperClassName}>
            <div className={layoutClassName}>
                <div className="space-y-1">
                    <h1 className={`${isCompact ? 'text-[1.65rem] sm:text-[1.9rem]' : 'text-2xl sm:text-[1.75rem]'} text-balance font-black tracking-tight text-foreground`}>
                        {title}
                    </h1>
                    {subtitle ? (
                        <p className={`${isCompact ? 'text-[11px] sm:text-[13px]' : 'text-xs sm:text-sm'} text-pretty font-semibold text-muted-foreground`}>
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className={isCentered ? 'w-full sm:w-auto' : 'w-full sm:w-auto sm:shrink-0'}>{actions}</div> : null}
            </div>
            {status ? (
                <div className={isCentered ? 'flex justify-center' : ''}>
                    {status}
                </div>
            ) : null}
        </div>
    );
}
