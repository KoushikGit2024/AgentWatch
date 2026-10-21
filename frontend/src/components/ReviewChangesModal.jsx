import React, { useState, useEffect } from 'react';

export function ReviewChangesModal({ isOpen, onClose }) {
    const [reviewData, setReviewData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchReview = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/v1/git/review', {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            if (res.ok) {
                const data = await res.json();
                setReviewData(data);
            }
        } catch {} finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchReview();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none" onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-100">Review Changes</h3>
                            <p className="text-[11px] text-zinc-400">Inspecting workspace working tree and recent patches</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchReview}
                            title="Refresh Changes"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                        >
                            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Stat Summary */}
                    {reviewData?.stat && (
                        <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl font-mono text-xs text-zinc-300 overflow-x-auto whitespace-pre">
                            {reviewData.stat}
                        </div>
                    )}

                    {/* Modified Files List */}
                    {reviewData?.files && reviewData.files.length > 0 && (
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Changed Files ({reviewData.files.length})</h4>
                            <div className="space-y-1">
                                {reviewData.files.map((f, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs py-1.5 px-3 bg-zinc-950 border border-zinc-800 rounded-lg font-mono">
                                        <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                            f.status === 'M' ? 'bg-amber-500/20 text-amber-300' :
                                            f.status === 'A' || f.status === '??' ? 'bg-emerald-500/20 text-emerald-300' :
                                            'bg-rose-500/20 text-rose-300'
                                        }`}>
                                            {f.status}
                                        </span>
                                        <span className="text-zinc-200 truncate">{f.file}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Diff Preview */}
                    <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Patch Diff</h4>
                        <div className="p-3.5 bg-zinc-950 border border-zinc-800/90 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto max-h-72 whitespace-pre text-zinc-300 select-text">
                            {reviewData?.diff?.split('\n').map((line, idx) => {
                                const isAdd = line.startsWith('+') && !line.startsWith('+++');
                                const isDel = line.startsWith('-') && !line.startsWith('---');
                                const isHeader = line.startsWith('diff') || line.startsWith('index') || line.startsWith('@@');
                                return (
                                    <div
                                        key={idx}
                                        className={`${
                                            isAdd ? 'text-emerald-400 bg-emerald-950/20' :
                                            isDel ? 'text-rose-400 bg-rose-950/20' :
                                            isHeader ? 'text-blue-400 font-bold opacity-80' :
                                            'text-zinc-400'
                                        }`}
                                    >
                                        {line || ' '}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-xs">
                    <span className="text-zinc-500 text-[11px]">Synced with local Git workspace</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition active:scale-95 border border-zinc-700/80"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
