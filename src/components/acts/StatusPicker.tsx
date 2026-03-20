import type { ArrivalStatus } from '@/types/domain';
import { CheckCircle2, Clock, UserCheck, AlertCircle } from 'lucide-react';

interface StatusPickerProps {
    currentStatus: ArrivalStatus;
    onStatusChange: (status: ArrivalStatus) => void;
    isLoading?: boolean;
    disabled?: boolean;
}

const statuses: { label: string; value: ArrivalStatus; icon: any; color: string }[] = [
    { label: 'Wait', value: 'Not Arrived', icon: AlertCircle, color: 'text-slate-400' },
    { label: 'In', value: 'Arrived', icon: UserCheck, color: 'text-amber-500' },
    { label: 'Back', value: 'Backstage', icon: Clock, color: 'text-blue-500' },
    { label: 'Ready', value: 'Ready', icon: CheckCircle2, color: 'text-emerald-500' },
];

export function StatusPicker({ currentStatus, onStatusChange, isLoading, disabled }: StatusPickerProps) {
    return (
        <div className="flex w-full bg-muted p-1.5 rounded-full border border-border min-h-[56px]">
            {statuses.map((s) => {
                const isActive = currentStatus === s.value;
                const Icon = s.icon;

                return (
                    <button
                        key={s.value}
                        disabled={isLoading || disabled}
                        onClick={() => onStatusChange(s.value)}
                        className={`
              flex-1 flex flex-col items-center justify-center py-2.5 rounded-full transition-all duration-200 min-h-[44px]
              ${isActive
                                ? 'bg-card shadow-md scale-[1.05] text-primary'
                                : 'text-muted-foreground hover:bg-accent/50'
                            }
              ${isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
                    >
                        <Icon className={`w-5 h-5 mb-1 ${isActive ? 'animate-pulse' : ''}`} />
                        <span className="text-[10px] font-black uppercase tracking-tight">{s.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
