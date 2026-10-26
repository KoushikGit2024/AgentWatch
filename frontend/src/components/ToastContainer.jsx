import React, { useState, useEffect } from 'react';
import { toastService } from '../services/toastService';
import { Icon } from '../constants/icons';

const TOAST_THEMES = {
  error: {
    bg: 'bg-[#17191C] border-[#D77E83]/50 text-[#E8EAED]',
    iconColor: 'text-[#D77E83]',
    icon: Icon.alertTriangle,
  },
  warning: {
    bg: 'bg-[#17191C] border-[#D8B36A]/50 text-[#E8EAED]',
    iconColor: 'text-[#D8B36A]',
    icon: Icon.alertCircle,
  },
  success: {
    bg: 'bg-[#17191C] border-[#79B89A]/50 text-[#E8EAED]',
    iconColor: 'text-[#79B89A]',
    icon: Icon.check,
  },
  info: {
    bg: 'bg-[#17191C] border-[#30343A] text-[#E8EAED]',
    iconColor: 'text-[#7C9FC5]',
    icon: Icon.info,
  },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return toastService.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-3 right-3 z-[9999] max-w-sm w-[calc(100%-1.5rem)] flex flex-col gap-2 pointer-events-none select-none"
      aria-live="polite"
    >
      {toasts.map(t => {
        const theme = TOAST_THEMES[t.type] || TOAST_THEMES.info;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-lg border shadow-xl transition-all ${theme.bg}`}
            role="alert"
          >
            <div className={`w-4 h-4 shrink-0 mt-0.5 ${theme.iconColor}`}>{theme.icon}</div>

            <div className="flex-1 min-w-0 pr-1">
              {t.title && (
                <div className="text-xs font-semibold leading-tight mb-0.5 text-[#E8EAED]">
                  <span>{t.title}</span>
                </div>
              )}
              {t.message && (
                <p className="text-[11px] leading-relaxed text-[#A0A6AF] break-words [overflow-wrap:anywhere]">
                  {t.message}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => toastService.dismiss(t.id)}
              aria-label="Dismiss notification"
              className="p-1 -mr-1 -mt-1 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer shrink-0"
            >
              <div className="w-3.5 h-3.5">{Icon.x}</div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
