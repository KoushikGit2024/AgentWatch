import React from 'react';

export function SelectionModal({ isOpen, title, options, onSelect, onClose }) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity select-none"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xs bg-zinc-900 border border-zinc-750 rounded-lg p-4 shadow-xl animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-sm font-semibold text-zinc-100 mb-3">{title}</h3>
                <div className="space-y-1.5">
                    {options.map(opt => (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => onSelect(opt)}
                            className="w-full text-left px-3 py-2 text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-md transition"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
                <div className="mt-3 text-right">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
