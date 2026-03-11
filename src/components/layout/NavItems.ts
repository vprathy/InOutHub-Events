import {
    LayoutDashboard,
    Users,
    ListOrdered,
    MonitorPlay,
    Hammer
} from 'lucide-react';

export interface NavItem {
    label: string;
    href: string;
    icon: any;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Participants', href: '/participants', icon: Users },
    { label: 'Acts', href: '/acts', icon: ListOrdered },
    { label: 'Lineup', href: '/lineup', icon: MonitorPlay },
    { label: 'Console', href: '/stage-console', icon: MonitorPlay }, // Re-using for now, will fix icon
];

export const DEV_NAV_ITEMS: NavItem[] = [
    { label: 'Dev Login', href: '/dev/login', icon: Hammer },
];
