import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

interface ActionOption {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
    icon?: React.ReactNode;
}

interface ActionMenuProps {
    options: ActionOption[];
}

export function ActionMenu({ options }: ActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
            >
                <MoreVertical className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-150">
                    <div className="py-1">
                        {options.map((option, index) => (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    option.onClick();
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors flex items-center space-x-2 ${option.variant === 'danger'
                                        ? 'text-red-500 hover:bg-red-500/10'
                                        : 'text-foreground hover:bg-muted'
                                    }`}
                            >
                                {option.icon && <span className="shrink-0">{option.icon}</span>}
                                <span>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
