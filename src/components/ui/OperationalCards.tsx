import type { LucideIcon } from 'lucide-react';
import { BadgeAlert, ChevronRight } from 'lucide-react';
import { InlineInfoTip } from '@/components/ui/InlineInfoTip';

export type OperationalTone = 'default' | 'good' | 'warning' | 'critical' | 'info';

const chipToneClasses: Record<OperationalTone, string> = {
  default: 'bg-muted text-muted-foreground',
  good: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-orange-500/10 text-orange-600',
  critical: 'bg-rose-500/10 text-rose-600',
  info: 'bg-sky-500/10 text-sky-600',
};

const accentToneClasses: Record<OperationalTone, string> = {
  default: 'bg-border',
  good: 'bg-emerald-500',
  warning: 'bg-orange-500',
  critical: 'bg-rose-500',
  info: 'bg-sky-500',
};

const iconToneClasses: Record<OperationalTone, string> = {
  default: 'text-muted-foreground/80',
  good: 'text-emerald-600',
  warning: 'text-orange-500',
  critical: 'text-rose-500',
  info: 'text-sky-500',
};

export function OperationalMetricCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  onClick,
  infoBody,
  infoLabel,
  detail,
  compact = false,
  className = '',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: OperationalTone;
  onClick?: () => void;
  infoBody?: string;
  infoLabel?: string;
  detail?: string;
  compact?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`${compact ? 'text-[1.05rem]' : 'text-[1.45rem]'} font-black leading-none tracking-tight text-foreground`}>{value}</p>
          <p className={`${compact ? 'mt-0.5' : 'mt-1.5'} text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground`}>
            {label}
          </p>
          {detail ? (
            <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className={`flex ${compact ? 'h-4.5 w-4.5' : 'h-6 w-6'} items-center justify-center ${iconToneClasses[tone]}`}>
            <Icon className={`${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          </div>
          {infoBody ? (
            <div
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <InlineInfoTip
                label={infoLabel || `About ${label}`}
                body={infoBody}
                align="right"
                className="shrink-0"
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 ${accentToneClasses[tone]}`} />
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`surface-panel relative ${compact ? 'min-h-[56px] rounded-[0.95rem] px-2.5 py-1.5' : 'min-h-[76px] rounded-[1rem] px-3 py-2.5'} overflow-hidden border text-left transition active:scale-[0.98] ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`surface-panel relative ${compact ? 'min-h-[56px] rounded-[0.95rem] px-2.5 py-1.5' : 'min-h-[76px] rounded-[1rem] px-3 py-2.5'} overflow-hidden border ${className}`}>
      {content}
    </div>
  );
}

export function OperationalResponseCard({
  label,
  detail,
  count,
  tone = 'default',
  action: _action,
  onClick,
  className = '',
}: {
  label: string;
  detail: string;
  count?: string | number;
  tone?: OperationalTone;
  action?: string;
  onClick?: () => void;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <p className={`truncate rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${chipToneClasses[tone]}`}>
              {label}
            </p>
            {count !== undefined ? (
              <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/70">
                {count}
              </span>
            ) : null}
          </div>
          <p className="truncate pr-1 text-sm leading-5 text-foreground/80">{detail}</p>
        </div>
        {onClick ? (
          <div className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center self-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <ChevronRight className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 ${accentToneClasses[tone]}`} />
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`surface-panel relative w-full overflow-hidden rounded-[1.2rem] border px-3.5 py-3 text-left transition active:scale-[0.99] ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`surface-panel relative w-full overflow-hidden rounded-[1.2rem] border px-3.5 py-3 ${className}`}>
      {content}
    </div>
  );
}

export function OperationalEmptyResponse({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="surface-panel rounded-[1.2rem] border px-3.5 py-3">
      <div className="flex items-center gap-2">
        <div className="text-emerald-600">
          <BadgeAlert className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="truncate text-sm text-foreground/80">{detail}</p>
        </div>
      </div>
    </div>
  );
}
