import React, { useState, useEffect } from 'react';
import { toastService } from '../services/toastService';
import { Icon } from '../constants/icons';

const TOAST_THEMES = {
    error: {
        bg: 'bg-rose-950/90 border-rose-800/80 text-rose-100 shadow-rose-950/40',
        iconColor: 'text-rose-400',
        icon: Icon.alertTriangle,
        badge: 'bg-rose-900/60 text-rose-300 border-rose-700/50'
    },
    warning: {
        bg: 'bg-amber-950/90 border-amber-800/80 text-amber-100 shadow-amber-950/40',
        iconColor: 'text-amber-400',
        icon: Icon.alertCircle,
        badge: 'bg-amber-900/60 text-amber-300 border-amber-700/50'
    },
    success: {
        bg: 'bg-emerald-950/90 border-emerald-800/80 text-emerald-100 shadow-emerald-950/40',
        iconColor: 'text-emerald-400',
        icon: Icon.check,
        badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50'
    },
    info: {
        bg: 'bg-zinc-900/90 border-zinc-750 text-zinc-100 shadow-black/50',
        iconColor: 'text-blue-400',
        icon: Icon.info,
        badge: 'bg-zinc-800 text-zinc-300 border-zinc-700'
    }
};

export default function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        return toastService.subscribe(setToasts);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div
            className="fixed top-4 right-4 z-[9999] max-w-sm w-[calc(100%-2rem)] flex flex-col gap-2 pointer-events-none select-none transition-all"
            aria-live="polite"
        >
            {toasts.map(t => {
                const theme = TOAST_THEMES[t.type] || TOAST_THEMES.info;
                return (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-3 duration-200 ${theme.bg}`}
                        role="alert"
                    >
                        <div className={`w-5 h-5 shrink-0 mt-0.5 ${theme.iconColor}`}>
                            {theme.icon}
                        </div>

                        <div className="flex-1 min-w-0 pr-1">
                            {t.title && (
                                <div className="text-xs font-semibold leading-tight mb-0.5 tracking-tight flex items-center gap-1.5">
                                    <span>{t.title}</span>
                                </div>
                            )}
                            {t.message && (
                                <p className="text-[11px] leading-relaxed opacity-90 break-words [overflow-wrap:anywhere]">
                                    {t.message}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => toastService.dismiss(t.id)}
                            className="p-1 -mr-1 -mt-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
                            title="Dismiss notification"
                        >
                            <div className="w-3.5 h-3.5">{Icon.x}</div>
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
