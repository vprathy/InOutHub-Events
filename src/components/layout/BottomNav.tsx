import React from 'react';
import { NavLink } from 'react-router-dom';
import { PRIMARY_NAV_ITEMS } from '@/components/layout/NavItems';

export const BottomNav: React.FC = () => {
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';

    return (
        <nav
            aria-label="Primary"
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl"
        >
            <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-2">
                {PRIMARY_NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        aria-label={item.label}
                        className={({ isActive }) => `
                            group relative flex min-h-[64px] flex-1 flex-col items-center justify-center rounded-none px-1 transition-all duration-200
                            ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`rounded-xl p-1.5 transition-all duration-200 ${isActive ? 'bg-primary/8' : 'group-hover:bg-accent/50'}`}>
                                    <item.icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
                                </div>
                                <span className={`mt-1 max-w-[64px] text-center text-[9px] font-bold leading-[1.1] tracking-tight transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="absolute left-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
            
            {/* Subtle version indicator for cache validation */}
            <div className="pointer-events-none absolute bottom-1 right-2 hidden text-[8px] font-medium tabular-nums text-muted-foreground/30 sm:block">
                v{version}
            </div>
        </nav>
    );
};
