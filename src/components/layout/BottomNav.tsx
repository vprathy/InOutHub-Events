import React from 'react';
import { NavLink } from 'react-router-dom';
import { PRIMARY_NAV_ITEMS } from '@/components/layout/NavItems';
import { useSelection } from '@/context/SelectionContext';
import { useCurrentEventRole } from '@/hooks/useCurrentEventRole';
import { useCurrentOrgRole } from '@/hooks/useCurrentOrgRole';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';

export const BottomNav: React.FC = () => {
    const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
    const { eventId, organizationId } = useSelection();
    const { data: currentEventRole } = useCurrentEventRole(eventId || null);
    const { data: currentOrgRole } = useCurrentOrgRole(organizationId || null);
    const { data: isSuperAdmin = false } = useIsSuperAdmin();
    const canManageAdmin =
        isSuperAdmin || currentEventRole === 'EventAdmin' || currentOrgRole === 'Owner' || currentOrgRole === 'Admin';
    const navItems = PRIMARY_NAV_ITEMS.filter((item) => item.href !== '/admin' || canManageAdmin);

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/82 pb-[max(env(safe-area-inset-bottom),0.35rem)] pt-1 backdrop-blur-xl shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
            <div className="mx-auto w-full min-w-0 max-w-screen-xl px-4 sm:px-6">
                <div className="mx-auto flex h-16 max-w-md items-stretch justify-around px-3">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) => `
                            relative flex flex-1 flex-col items-center justify-center px-1.5 transition-all duration-300 group
                            ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                        `}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`rounded-xl p-1.5 transition-all duration-300 ${isActive ? 'bg-primary/5' : 'group-hover:bg-accent/50'}`}>
                                        <item.icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
                                    </div>
                                    <span className={`mt-1 whitespace-nowrap text-center text-[8px] font-bold leading-none tracking-tight transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                                        {item.mobileLabel || item.label}
                                    </span>
                                    {isActive && (
                                        <div className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </div>
            <div className="pointer-events-none absolute bottom-1 right-4 text-[8px] font-medium tabular-nums text-muted-foreground/30 sm:right-6">
                v{version}
            </div>
        </nav>
    );
};
