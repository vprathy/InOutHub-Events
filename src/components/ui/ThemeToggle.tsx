import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex items-center bg-slate-200 dark:bg-slate-900 p-1 rounded-full border border-slate-300 dark:border-slate-800 shadow-inner">
            <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-full transition-all ${theme === 'light'
                        ? 'bg-white text-teal-600 shadow-sm scale-110'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                title="Light Mode"
            >
                <Sun className="w-4 h-4" />
            </button>

            <button
                onClick={() => setTheme('system')}
                className={`p-1.5 rounded-full transition-all ${theme === 'system'
                        ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm scale-110'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                title="System Preference"
            >
                <Monitor className="w-4 h-4" />
            </button>

            <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-full transition-all ${theme === 'dark'
                        ? 'bg-slate-800 text-teal-400 shadow-sm scale-110'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                title="Dark Mode"
            >
                <Moon className="w-4 h-4" />
            </button>
        </div>
    );
}
