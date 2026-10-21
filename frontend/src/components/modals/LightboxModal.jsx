import React from 'react';
import { Icon } from '../../constants/icons';

export default function LightboxModal({ isOpen, onClose, screenshotUrl }) {
    if (!isOpen || !screenshotUrl) return null;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 select-none cursor-zoom-out"
            onClick={onClose}
        >
            <div className="flex items-center justify-between pb-3 shrink-0">
                <span className="text-xs font-semibold text-zinc-300">Fullscreen Antigravity Viewport</span>
                <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg transition cursor-pointer"
                >
                    <div className="w-5 h-5">{Icon.x}</div>
                </button>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-auto">
                <img
                    src={screenshotUrl}
                    alt="Fullscreen Viewport"
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
            </div>
        </div>
    );
}
