import { getArrivalStatusLabel, type ArrivalStatus } from '@/types/domain';
import { CheckCircle2, Clock, UserCheck, AlertCircle } from 'lucide-react';

interface StatusPickerProps {
    currentStatus: ArrivalStatus;
    onStatusChange: (status: ArrivalStatus) => void;
    isLoading?: boolean;
}

const statuses: { label: string; value: ArrivalStatus; icon: any; color: string }[] = [
    { label: getArrivalStatusLabel('Not Arrived'), value: 'Not Arrived', icon: AlertCircle, color: 'text-slate-400' },
    { label: getArrivalStatusLabel('Arrived'), value: 'Arrived', icon: UserCheck, color: 'text-amber-500' },
    { label: getArrivalStatusLabel('Backstage'), value: 'Backstage', icon: Clock, color: 'text-blue-500' },
    { label: getArrivalStatusLabel('Ready'), value: 'Ready', icon: CheckCircle2, color: 'text-emerald-500' },
];

export function StatusPicker({ currentStatus, onStatusChange, isLoading }: StatusPickerProps) {
    return (
        <div className="flex w-full bg-muted p-1.5 rounded-full border border-border min-h-[56px]">
            {statuses.map((s) => {
                const isActive = currentStatus === s.value;
                const Icon = s.icon;

                return (
                    <button
                        key={s.value}
                        disabled={isLoading}
                        onClick={() => onStatusChange(s.value)}
                        className={`
              flex-1 flex flex-col items-center justify-center rounded-full px-1 py-2.5 text-center transition-all duration-200 min-h-[44px]
              ${isActive
                                ? 'bg-card shadow-md scale-[1.05] text-primary'
                                : 'text-muted-foreground hover:bg-accent/50'
                            }
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
                    >
                        <Icon className={`w-5 h-5 mb-1 ${isActive ? 'animate-pulse' : ''}`} />
                        <span className="max-w-full text-center text-[9px] font-black uppercase leading-[1.05] tracking-tight">
                            {s.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
