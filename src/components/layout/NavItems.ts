import {
    LayoutDashboard,
    Users,
    ListOrdered,
    MonitorPlay,
    Hammer,
    Calendar,
    ShieldCheck,
} from 'lucide-react';

export interface NavItem {
    label: string;
    href: string;
    icon: any;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Participants', href: '/participants', icon: Users },
    { label: 'Performances', href: '/performances', icon: ListOrdered },
    { label: 'Access', href: '/access', icon: ShieldCheck },
    { label: 'Show Flow', href: '/show-flow', icon: Calendar },
    { label: 'Console', href: '/stage-console', icon: MonitorPlay },
];

export const DEV_NAV_ITEMS: NavItem[] = [
    { label: 'Dev Login', href: '/dev/login', icon: Hammer },
];
