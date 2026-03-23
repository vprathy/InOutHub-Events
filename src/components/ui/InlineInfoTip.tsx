import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

type InlineInfoTipProps = {
    label: string;
    body: string;
    align?: 'left' | 'right';
    className?: string;
};

export function InlineInfoTip({
    label,
    body,
    align = 'left',
    className = '',
}: InlineInfoTipProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

    useLayoutEffect(() => {
        if (!isOpen || !buttonRef.current) return;

        const updatePosition = () => {
            const rect = buttonRef.current?.getBoundingClientRect();
            if (!rect) return;

            const width = Math.min(288, window.innerWidth - 24);
            const top = rect.bottom + 8;
            const preferredLeft = align === 'right' ? rect.right - width : rect.left;
            const left = Math.min(
                Math.max(12, preferredLeft),
                Math.max(12, window.innerWidth - width - 12),
            );

            setPosition({ top, left, width });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [align, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event: MouseEvent | TouchEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [isOpen]);

    return (
        <div ref={containerRef} className={`relative inline-flex ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg border border-border/60 bg-background/70 text-muted-foreground transition-colors hover:border-primary/20 hover:text-foreground"
                aria-label={label}
                aria-expanded={isOpen}
            >
                <Info className="h-4 w-4" />
            </button>
            {isOpen && position ? createPortal(
                <div
                    className="fixed z-[120] rounded-xl border border-border/70 bg-background/95 px-3 py-2 text-xs font-medium leading-relaxed text-muted-foreground shadow-lg backdrop-blur"
                    style={{
                        top: position.top,
                        width: position.width,
                        left: position.left,
                    }}
                    role="tooltip"
                >
                    <p className="font-black uppercase tracking-[0.14em] text-foreground">{label}</p>
                    <p className="mt-1">{body}</p>
                </div>,
                document.body,
            ) : null}
        </div>
    );
}
