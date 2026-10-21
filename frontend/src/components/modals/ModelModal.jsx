import React from 'react';
import { Icon } from '../../constants/icons';

export default function ModelModal({ isOpen, onClose, currentModel, onSelectModel }) {
    if (!isOpen) return null;

    const models = [
        'Default Antigravity Agent',
        'Gemini 3.8 Flash (Medium)',
        'Gemini 3.1 Pro (High)',
        'Claude Sonnet 4.6 (Thinking)',
        'Claude Opus 4.6 (Thinking)',
        'GPT-OSS 120B (Medium)'
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm select-none"
            onClick={onClose}
        >
            <div
                className="w-full max-w-sm bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-4 pb-8 space-y-3"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h3 className="text-sm font-semibold text-zinc-100">Select Model</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                    >
                        <div className="w-4 h-4">{Icon.x}</div>
                    </button>
                </div>
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                    {models.map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => onSelectModel(m)}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                                currentModel === m ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-200'
                            }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
