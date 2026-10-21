import React from 'react';
import { Icon } from '../../constants/icons';

function parseModelTier(rawName) {
    if (!rawName) return { name: '', tier: '' };
    const match = rawName.match(/^(.*?)\s*(?:\((Thinking|High|Medium|Low)\)|(Thinking|High|Medium|Low))$/i);
    if (match) {
        return {
            name: match[1].trim(),
            tier: match[2] || match[3] || ''
        };
    }
    return { name: rawName, tier: '' };
}

export default function ModelModal({ isOpen, onClose, currentModel, availableModels = [], onSelectModel }) {
    if (!isOpen) return null;

    const list = Array.isArray(availableModels) && availableModels.length > 0
        ? availableModels
        : (currentModel ? [currentModel] : []);

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
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-100">Plan Models</h3>
                        <p className="text-[11px] text-zinc-400">Fetched from Antigravity IDE</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                    >
                        <div className="w-4 h-4">{Icon.x}</div>
                    </button>
                </div>
                <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                    {list.length === 0 ? (
                        <div className="p-4 text-center text-xs text-zinc-400">
                            Connecting to IDE to detect plan models…
                        </div>
                    ) : (
                        list.map(m => {
                            const { name, tier } = parseModelTier(m);
                            const isActive = currentModel === m || (currentModel && currentModel.includes(name));
                            return (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => onSelectModel(m)}
                                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                                        isActive ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-zinc-800 text-zinc-200'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <span className="truncate">{name}</span>
                                        {tier && (
                                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                                isActive ? 'bg-blue-700/80 text-blue-100' : 'bg-zinc-800 text-zinc-400 border border-zinc-750'
                                            }`}>
                                                {tier}
                                            </span>
                                        )}
                                    </div>
                                    {isActive && (
                                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-700 text-white shrink-0 ml-2">Active</span>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
