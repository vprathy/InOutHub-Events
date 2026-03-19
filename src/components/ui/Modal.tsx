import * as React from "react"
import { X } from "lucide-react"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    hideCloseButton?: boolean
    closeOnBackdrop?: boolean
}

export function Modal({ isOpen, onClose, title, children, hideCloseButton = false, closeOnBackdrop = true }: ModalProps) {
    React.useEffect(() => {
        if (!isOpen) return

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
            onClick={closeOnBackdrop ? onClose : undefined}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity"
            />

            {/* Modal */}
            <div
                className="relative my-8 flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
                    {hideCloseButton ? null : (
                        <button
                            onClick={onClose}
                            className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="min-h-0 overflow-y-auto pr-1">
                    {children}
                </div>
            </div>
        </div>
    )
}
