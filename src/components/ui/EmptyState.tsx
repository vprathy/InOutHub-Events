import type { LucideIcon } from 'lucide-react';
import React from 'react';

interface EmptyStateProps {
    title: string;
    description: string;
    icon: LucideIcon;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon: Icon, action }) => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border rounded-2xl shadow-sm transition-colors">
            <div className="bg-muted p-4 rounded-full mb-4">
                <Icon className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
            <p className="text-muted-foreground max-w-sm mb-6">{description}</p>
            {action && (
                <button
                    onClick={action.onClick}
                    className="px-6 py-3 bg-primary text-white font-bold rounded-full transition-all hover:opacity-90 active:scale-95 shadow-lg shadow-primary/20"
                >
                    {action.label}
                </button>
            )}
        </div>
    );
};
