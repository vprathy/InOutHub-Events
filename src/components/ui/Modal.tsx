import * as React from "react"
import { X } from "lucide-react"

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {children}
            </div>
        </div>
    )
}
