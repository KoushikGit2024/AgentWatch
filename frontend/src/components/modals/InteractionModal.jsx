import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../constants/icons';

/**
 * InteractionModal — Full-screen blocking overlay for agent decision requests.
 * Renders with animated entrance, glassmorphism background, and prevents
 * all interaction until the user submits a response.
 */
export default function InteractionModal({
    interaction,
    selectedOptions,
    customResponse,
    isSubmitting,
    submitSuccess,
    onToggleOption,
    onChangeCustomResponse,
    onSubmit,
    onDismiss
}) {
    const [isVisible, setIsVisible] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (interaction) {
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [interaction]);

    useEffect(() => {
        if (interaction && inputRef.current && interaction.allow_custom_response) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [interaction]);

    if (!interaction) return null;

    const isMulti = interaction.kind === 'multiple_choice';
    const canSubmit = selectedOptions.size > 0 || customResponse.trim().length > 0;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ${
                isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ backdropFilter: isVisible ? 'blur(12px)' : 'none' }}
        >
            {/* Dark overlay */}
            <div
                className="absolute inset-0 bg-black/70"
                onClick={onDismiss}
            />

            {/* Modal Card */}
            <div
                className={`relative w-full sm:max-w-lg bg-zinc-900 border border-blue-500/40 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-blue-950/60 transition-all duration-300 overflow-hidden ${
                    isVisible ? 'translate-y-0 scale-100' : 'translate-y-8 scale-95'
                }`}
                style={{
                    boxShadow: isVisible
                        ? '0 0 0 1px rgba(59,130,246,0.3), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(59,130,246,0.15)'
                        : 'none'
                }}
            >
                {/* Animated glow stripe at top */}
                <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80" />

                {/* Scrollable body */}
                <div className="overflow-y-auto max-h-[85vh] p-5 space-y-4">

                    {/* Header */}
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                            <div className="w-5 h-5">{Icon.brain}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-950/70 border border-blue-800/60 px-2.5 py-0.5 rounded-full animate-pulse">
                                    Agent Needs Your Decision
                                </span>
                                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                                    {isMulti ? 'Multi-select' : 'Choose one'}
                                </span>
                            </div>
                            <h2 className="text-base font-bold text-zinc-50 mt-1.5 leading-snug">
                                {interaction.title}
                            </h2>
                            {interaction.description && (
                                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                    {interaction.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Options */}
                    {interaction.options?.length > 0 && (
                        <div className="space-y-2">
                            {interaction.options.map((opt, idx) => {
                                const isSelected = selectedOptions.has(opt.id);
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => onToggleOption(opt.id)}
                                        className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150 cursor-pointer group ${
                                            isSelected
                                                ? 'bg-blue-950/70 border-blue-500 shadow-lg shadow-blue-950/50'
                                                : 'bg-zinc-800/60 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800'
                                        }`}
                                    >
                                        {/* Indicator */}
                                        <div className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center border shrink-0 transition-all ${
                                            isSelected
                                                ? 'bg-blue-600 border-blue-400 shadow-md shadow-blue-800/60'
                                                : 'border-zinc-600 bg-zinc-900 group-hover:border-zinc-500'
                                        }`}>
                                            {isSelected && (
                                                <div className="w-3 h-3 text-white">{Icon.check}</div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-sm font-semibold transition-colors ${
                                                    isSelected ? 'text-blue-100' : 'text-zinc-200'
                                                }`}>
                                                    {opt.label}
                                                </span>
                                                {opt.is_recommended && (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
                                                        Recommended
                                                    </span>
                                                )}
                                            </div>
                                            {opt.description && (
                                                <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                                                    {opt.description}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Custom Response */}
                    {interaction.allow_custom_response && (
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                {interaction.custom_response_label || 'Or provide custom guidance'}
                            </label>
                            <textarea
                                ref={inputRef}
                                value={customResponse}
                                onChange={e => onChangeCustomResponse(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canSubmit) {
                                        e.preventDefault();
                                        onSubmit();
                                    }
                                }}
                                placeholder="Type a custom response to guide the agent..."
                                rows={3}
                                className="w-full bg-zinc-950 border border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 outline-none resize-none transition-all"
                            />
                            <p className="text-[10px] text-zinc-600">⌘+Enter or Ctrl+Enter to submit</p>
                        </div>
                    )}

                    {/* Footer: action buttons */}
                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-zinc-800">
                        <button
                            type="button"
                            onClick={onDismiss}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition px-2 py-1"
                        >
                            Dismiss
                        </button>

                        <div className="flex items-center gap-2">
                            {submitSuccess ? (
                                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 px-4 py-2 bg-emerald-950/60 rounded-xl border border-emerald-800">
                                    <div className="w-4 h-4">{Icon.check}</div>
                                    Response Sent!
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isSubmitting || !canSubmit}
                                    onClick={onSubmit}
                                    className="px-6 py-2.5 text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-lg shadow-blue-900/50 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                                                <path d="M12 2a10 10 0 0 1 10 10" />
                                            </svg>
                                            Sending…
                                        </span>
                                    ) : 'Submit Response'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
