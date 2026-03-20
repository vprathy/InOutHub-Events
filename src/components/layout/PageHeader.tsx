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
    const Icon = section?.icon;

    return (
        <div className={`space-y-2 ${isCentered ? 'text-center' : ''}`}>
            <div className={`flex flex-col gap-2 ${isCentered ? 'items-center' : 'sm:flex-row sm:items-end sm:justify-between'}`}>
                <div className={`space-y-1 ${section ? 'rounded-[1.35rem] border px-4 py-3 shadow-sm' : ''} ${section?.shellClassName || ''}`}>
                    {section ? (
                        <div className={`inline-flex min-h-[32px] items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${section.badgeClassName}`}>
                            {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
                            <span>{section.group}</span>
                            <span className="opacity-55">/</span>
                            <span>{section.hint}</span>
                        </div>
                    ) : null}
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-[1.75rem]">
                        {title}
                    </h1>
                    {subtitle ? (
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
