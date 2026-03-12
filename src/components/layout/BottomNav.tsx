import React from 'react';
import { NavLink } from 'react-router-dom';
import { PRIMARY_NAV_ITEMS } from '@/components/layout/NavItems';

export const BottomNav: React.FC = () => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border pb-safe transition-colors">
            <div className="max-w-md mx-auto flex items-center justify-around h-16 px-4 sm:max-w-lg lg:max-2xl">
                {PRIMARY_NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.href}
                        to={item.href}
                        className={({ isActive }) => `
              flex flex-col items-center justify-center min-w-[64px] min-h-[44px] px-2 transition-all duration-200
              ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
            `}
                    >
                        <item.icon className="w-6 h-6" />
                        <span className="text-[10px] font-bold tracking-tight uppercase">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};
