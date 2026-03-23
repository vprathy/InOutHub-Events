import type { ReactNode } from 'react';
import { useSectionIdentity } from '@/components/layout/sectionIdentity';

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
    const section = useSectionIdentity();
    const showTitle = !section;
    const showSubtitle = !section && !!subtitle;

    return (
        <div className={`space-y-2 ${isCentered ? 'text-center' : ''}`}>
            <div className={`flex flex-col gap-2 ${isCentered ? 'items-center' : 'sm:flex-row sm:items-end sm:justify-between'}`}>
                <div className="space-y-1">
                    {showTitle ? (
                        <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-[1.75rem]">
                            {title}
                        </h1>
                    ) : null}
                    {showSubtitle ? (
                        <p className="text-xs font-semibold text-muted-foreground sm:text-sm">
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
