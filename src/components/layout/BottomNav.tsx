import React from 'react';
import { NavLink } from 'react-router-dom';
import { PRIMARY_NAV_ITEMS } from '@/components/layout/NavItems';

export const BottomNav: React.FC = () => {
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/40 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
            <div className="max-w-md mx-auto flex items-stretch justify-around h-16 px-4">
                {PRIMARY_NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) => `
                            flex flex-col items-center justify-center flex-1 px-1 transition-all duration-300 relative group
                            ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                        `}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary/5' : 'group-hover:bg-accent/50'}`}>
                                    <item.icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
                                </div>
                                <span className={`text-[9px] font-bold tracking-tight text-center leading-[1.1] max-w-[64px] line-clamp-2 mt-1 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                                    {item.label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
            
            {/* Subtle version indicator for cache validation */}
            <div className="absolute bottom-1 right-2 text-[8px] font-medium text-muted-foreground/30 tabular-nums pointer-events-none">
                v{version}
            </div>
        </nav>
    );
};
