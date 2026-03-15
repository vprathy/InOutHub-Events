import type { ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    status?: ReactNode;
    align?: 'left' | 'center';
}

export function PageHeader({
    title,
    subtitle,
    actions,
    status,
    align = 'left',
}: PageHeaderProps) {
    const isCentered = align === 'center';

    return (
        <div className={`space-y-3 ${isCentered ? 'text-center' : ''}`}>
            <div className={`flex flex-col gap-3 ${isCentered ? 'items-center' : 'sm:flex-row sm:items-end sm:justify-between'}`}>
                <div className="space-y-1">
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                        {title}
                    </h1>
                    {subtitle ? (
                        <p className="text-sm font-medium text-muted-foreground">
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                {actions ? <div className={isCentered ? '' : 'sm:shrink-0'}>{actions}</div> : null}
            </div>
            {status ? (
                <div className={isCentered ? 'flex justify-center' : ''}>
                    {status}
                </div>
            ) : null}
        </div>
    );
}
