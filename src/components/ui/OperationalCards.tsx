import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, BadgeAlert, ChevronRight } from 'lucide-react';

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

export function OperationalMetricCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
  onClick,
  detail,
  className = '',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: OperationalTone;
  onClick?: () => void;
  detail?: string;
  className?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[1.45rem] font-black leading-none tracking-tight text-foreground">{value}</p>
          <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] leading-4 ${chipToneClasses[tone]}`}>
            {label}
          </p>
          {detail ? (
            <p className="mt-1.5 text-xs text-muted-foreground">{detail}</p>
          ) : null}
        </div>
        <div className="flex min-h-[52px] w-8 shrink-0 flex-col items-center justify-between pt-0.5">
          <div className="rounded-lg bg-foreground/5 p-1.5 text-foreground/80">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <ArrowUpRight className="h-3 w-3 text-foreground/30" />
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 ${accentToneClasses[tone]}`} />
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`surface-panel relative min-h-[88px] overflow-hidden rounded-[1rem] border px-3 py-2.5 text-left transition active:scale-[0.98] ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`surface-panel relative min-h-[88px] overflow-hidden rounded-[1rem] border px-3 py-2.5 ${className}`}>
      {content}
    </div>
  );
}

export function OperationalResponseCard({
  label,
  detail,
  count,
  tone = 'default',
  action,
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
        <div className="min-w-0 flex-1 space-y-1">
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
          <p className="pr-1 text-sm leading-5 text-foreground/80">{detail}</p>
        </div>
        {onClick ? (
          <div className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center self-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <ChevronRight className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      {action ? (
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.16em] text-foreground/55">{action}</p>
      ) : null}
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
    <div className="surface-panel rounded-[1.5rem] p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-emerald-500/10 p-2.5 text-emerald-600">
          <BadgeAlert className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="text-sm font-bold text-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}
