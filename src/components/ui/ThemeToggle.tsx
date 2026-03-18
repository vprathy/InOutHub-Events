import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="surface-panel flex items-center rounded-full p-1 shadow-inner">
            <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition-all ${theme === 'light'
                    ? 'bg-background text-primary shadow-sm scale-110'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                title="Light Mode"
            >
                <Sun className="w-4 h-4" />
            </button>

            <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-full transition-all ${theme === 'system'
                    ? 'bg-background text-primary shadow-sm scale-110'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                title="System Preference"
            >
                <Monitor className="w-4 h-4" />
            </button>

            <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition-all ${theme === 'dark'
                    ? 'bg-background text-primary shadow-sm scale-110'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                title="Dark Mode"
            >
                <Moon className="w-4 h-4" />
            </button>
        </div>
    );
}
