import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../../constants/icons';
import { useWebPush } from '../../hooks/useWebPush';

export default function NotificationMenu() {
    const [open, setOpen] = useState(false);
    const popoverRef = useRef(null);
    const {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
        sendTest
    } = useWebPush();

    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    return (
        <div className="relative inline-flex items-center" ref={popoverRef}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                title={
                    !isSupported
                        ? 'Push notifications not supported on this browser'
                        : isSubscribed
                        ? 'Push notifications enabled'
                        : 'Enable push notifications'
                }
                className={`aw-focus-ring relative p-1.5 rounded-md border transition cursor-pointer ${
                    open
                        ? 'bg-[#1D2024] text-[#E8EAED] border-[#30343A]'
                        : isSubscribed
                        ? 'text-cyan-400 hover:text-cyan-300 border-transparent hover:bg-[#1D2024]'
                        : 'text-[#A0A6AF] hover:text-[#E8EAED] border-transparent hover:bg-[#1D2024]'
                }`}
            >
                <div className="w-4 h-4">
                    {isSubscribed ? Icon.bell : Icon.bellOff}
                </div>
                {isSubscribed && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 ring-2 ring-[#17191C]" />
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[#17191C] border border-[#30343A] rounded-xl shadow-2xl p-3 space-y-3 z-50 text-xs text-[#E8EAED]">
                    <div className="flex items-center justify-between border-b border-[#262A30] pb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 text-cyan-400">{Icon.bell}</div>
                            <span className="font-semibold tracking-tight">Push Notifications</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1D2024] border border-[#30343A] text-[#A0A6AF]">
                            {isSubscribed ? 'Active' : permission === 'denied' ? 'Blocked' : 'Off'}
                        </span>
                    </div>

                    <p className="text-[11px] text-[#A0A6AF] leading-relaxed">
                        Receive instant phone or desktop notifications for approvals and questions, even when your browser is closed.
                    </p>

                    {!isSupported ? (
                        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                            Web Push is unavailable in this environment (requires HTTPS or localhost).
                        </div>
                    ) : (
                        <div className="space-y-2 pt-1">
                            {!isSubscribed ? (
                                <button
                                    type="button"
                                    disabled={isLoading}
                                    onClick={subscribe}
                                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                                >
                                    <span>{isLoading ? 'Setting up...' : 'Enable Notifications on this Device'}</span>
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <button
                                        type="button"
                                        disabled={isLoading}
                                        onClick={sendTest}
                                        className="w-full py-1.5 px-3 rounded-lg bg-[#23272D] hover:bg-[#2D323A] border border-[#30343A] text-[#E8EAED] text-xs font-medium transition cursor-pointer"
                                    >
                                        Send Test Notification
                                    </button>
                                    <button
                                        type="button"
                                        disabled={isLoading}
                                        onClick={unsubscribe}
                                        className="w-full py-1.5 px-3 rounded-lg hover:bg-rose-500/10 text-rose-400 text-xs transition cursor-pointer text-center"
                                    >
                                        Disable Notifications
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
