import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../constants/icons';

/**
 * InteractionModal — Full-screen overlay for dynamic Antigravity agent questions.
 * Shows all predefined options (single-choice or multi-choice) AND a clean
 * "Type something else..." option so users can either pick options, type custom
 * instructions, or combine both without mobile keyboard focus glitches.
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
    onDismiss,
    onCancel
}) {
    const [useCustomMode, setUseCustomMode] = useState(false);
    const inputRef = useRef(null);

    const interactionId = interaction?.interaction_id || null;

    useEffect(() => {
        if (interactionId) {
            const hasNoOptions = !interaction?.options || interaction.options.length === 0;
            setUseCustomMode(hasNoOptions);
        }
    }, [interactionId]);

    if (!interaction) return null;

    const isMulti = interaction.kind === 'multiple_choice' || Boolean(interaction.is_multi_select);
    const hasOptions = Array.isArray(interaction.options) && interaction.options.length > 0;
    const hasQuestions = Array.isArray(interaction.questions) && interaction.questions.length > 0;
    const totalQuestions = hasQuestions ? interaction.questions.length : 0;
    // Count how many questions have at least one option selected
    const answeredQuestions = hasQuestions
        ? interaction.questions.filter(q =>
            q.options && q.options.some(opt => selectedOptions.has(opt.id))
          ).length
        : 0;
    const canSubmit = selectedOptions.size > 0 || customResponse.trim().length > 0;

    const handleSelectCustomMode = () => {
        setUseCustomMode(true);
        setTimeout(() => inputRef.current?.focus(), 80);
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md transition-opacity duration-150 opacity-100"
        >
            {/* Dark overlay */}
            <div
                className="absolute inset-0 bg-black/75 cursor-pointer"
                onClick={!isSubmitting ? (onCancel || onDismiss) : undefined}
            />

            {/* Modal Card */}
            <div
                className="relative w-full sm:max-w-lg bg-zinc-900 border border-blue-500/40 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-blue-950/60 transition-all duration-200 overflow-hidden translate-y-0 scale-100"
                style={{
                    boxShadow: '0 0 0 1px rgba(59,130,246,0.3), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(59,130,246,0.15)'
                }}
            >
                {/* Animated glow stripe at top */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-indigo-400 to-blue-600 opacity-90" />

                {/* Scrollable body */}
                <div className="overflow-y-auto max-h-[86dvh] p-5 space-y-4">

                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                                <div className="w-5 h-5">{Icon.brain}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-950/70 border border-blue-800/60 px-2.5 py-0.5 rounded-full animate-pulse">
                                        {interaction.popup_kind === 'browser_permission' ? 'Browser Permission' : interaction.type === 'approval' ? 'Command Approval' : 'Agent Question'}
                                    </span>
                                    {hasQuestions ? (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-violet-950/70 border border-violet-700/60 text-violet-300">
                                            {answeredQuestions}/{totalQuestions} Answered
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">
                                            {interaction.popup_kind === 'browser_permission' ? `Allow access to ${interaction.target || 'target domain'}` : !hasOptions ? 'Free Text Response' : isMulti ? 'Select one or more' : 'Choose an option or type below'}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-base font-bold text-zinc-50 mt-1.5 leading-snug">
                                    {interaction.title}
                                </h2>
                                {interaction.target_domain && (
                                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/80 text-xs font-mono text-blue-300">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                        <span>Target: <strong>{interaction.target_domain}</strong></span>
                                    </div>
                                )}
                                {interaction.description && (
                                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                                        {interaction.description}
                                    </p>
                                )}
                                {interaction.command && (
                                    <div className="mt-2 p-2.5 rounded-xl bg-zinc-950/90 border border-zinc-800 font-mono text-xs text-emerald-300 overflow-x-auto">
                                        <code>{interaction.command}</code>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Dismiss / Close Button */}
                        <button
                            type="button"
                            onClick={onCancel || onDismiss}
                            disabled={isSubmitting}
                            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer shrink-0 disabled:opacity-40"
                            title="Dismiss Question"
                            aria-label="Dismiss Question"
                        >
                            <div className="w-5 h-5">{Icon.x}</div>
                        </button>
                    </div>

                    {/* Multi-Question Sections (when ask_question contains multiple questions) */}
                    {Array.isArray(interaction.questions) && interaction.questions.length > 0 ? (
                        <div className="space-y-4">
                            {interaction.questions.map((q, qIdx) => {
                                const qAnswered = (q.options || []).some(opt => selectedOptions.has(opt.id));
                                return (
                                <div key={q.id || qIdx} className={`p-3.5 rounded-2xl border space-y-2.5 transition-all ${
                                    qAnswered
                                        ? 'bg-emerald-950/20 border-emerald-700/50'
                                        : 'bg-zinc-800/40 border-zinc-700/60'
                                }`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                                                qAnswered
                                                    ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300'
                                                    : 'bg-blue-950/80 border border-blue-700/60 text-blue-300'
                                            }`}>
                                                Q{qIdx + 1} of {totalQuestions}
                                            </span>
                                            <h3 className="text-xs font-bold text-zinc-100 leading-snug">{q.question}</h3>
                                        </div>
                                        {qAnswered && (
                                            <div className="shrink-0 w-4 h-4 text-emerald-400">{Icon.check}</div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 pl-1">
                                        {(q.options || []).map((opt, optIdx) => {
                                            const isSelected = selectedOptions.has(opt.id);
                                            return (
                                                <button
                                                    key={opt.id || optIdx}
                                                    type="button"
                                                    onClick={() => onToggleOption(opt.id, q)}
                                                    className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-xl border transition-all text-xs cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-blue-950/80 border-blue-500 text-blue-100 shadow-md shadow-blue-950/40'
                                                            : 'bg-zinc-850/60 border-zinc-700/60 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-250'
                                                    }`}
                                                >
                                                    <div className={`w-4 h-4 mt-0.5 ${q.is_multi_select ? 'rounded-md' : 'rounded-full'} flex items-center justify-center border shrink-0 text-[9px] font-bold ${
                                                        isSelected
                                                            ? 'bg-blue-600 border-blue-400 text-white'
                                                            : 'border-zinc-600 bg-zinc-900 text-zinc-400'
                                                    }`}>
                                                        {isSelected ? (
                                                            <div className="w-2.5 h-2.5 text-white">{Icon.check}</div>
                                                        ) : (
                                                            <span>{optIdx + 1}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="font-semibold text-zinc-100">{opt.label}</span>
                                                            {opt.is_recommended && (
                                                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
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
                                </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Single Question Options List */
                        hasOptions && (
                            <div className="space-y-2">
                                {interaction.options.map((opt, idx) => {
                                    const isSelected = selectedOptions.has(opt.id);
                                    return (
                                        <button
                                            key={opt.id || idx}
                                            type="button"
                                            onClick={() => onToggleOption(opt.id)}
                                            className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-150 cursor-pointer group ${
                                                isSelected
                                                    ? 'bg-blue-950/70 border-blue-500 shadow-lg shadow-blue-950/50'
                                                    : 'bg-zinc-800/60 border-zinc-700/80 hover:border-zinc-600 hover:bg-zinc-800'
                                            }`}
                                        >
                                            {/* Selection Indicator: Checkbox for multi-select, Radio for single-select */}
                                            <div className={`w-5 h-5 mt-0.5 ${isMulti ? 'rounded-md' : 'rounded-full'} flex items-center justify-center border shrink-0 transition-all text-[10px] font-bold ${
                                                isSelected
                                                    ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-800/60'
                                                    : 'border-zinc-600 bg-zinc-900 text-zinc-400 group-hover:border-zinc-500'
                                            }`}>
                                                {isSelected ? (
                                                    <div className="w-3 h-3 text-white">{Icon.check}</div>
                                                ) : (
                                                    <span>{idx + 1}</span>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-sm font-semibold transition-colors ${
                                                        isSelected ? 'text-blue-100' : 'text-zinc-100'
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

                                {/* Explicit "Type something else..." option row */}
                                {interaction.allow_custom_response !== false && !useCustomMode && (
                                    <button
                                        type="button"
                                        onClick={handleSelectCustomMode}
                                        className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-dashed border-zinc-700 hover:border-blue-500/60 bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-300 transition cursor-pointer"
                                    >
                                        <div className="w-5 h-5 rounded-full border border-zinc-600 bg-zinc-950 flex items-center justify-center text-xs text-blue-400 shrink-0">
                                            +
                                        </div>
                                        <span className="text-xs font-semibold text-zinc-300">
                                            Type something else / Provide custom instructions…
                                        </span>
                                    </button>
                                )}
                            </div>
                        )
                    )}

                    {/* Custom Response ("Type something else") */}
                    {(interaction.allow_custom_response !== false && (useCustomMode || !hasOptions || customResponse.length > 0)) && (
                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                    {interaction.custom_response_label || 'Type something else / Custom instructions'}
                                </label>
                                {hasOptions && selectedOptions.size > 0 && (
                                    <span className="text-[10px] text-blue-400">
                                        Will be sent alongside your selected option
                                    </span>
                                )}
                            </div>
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
                                placeholder="Type your own answer or instructions for the agent..."
                                rows={3}
                                className="w-full bg-zinc-950 border border-zinc-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none resize-none transition-all"
                            />
                        </div>
                    )}

                    {/* Footer: action buttons */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="text-xs text-zinc-400 hover:text-zinc-200 transition px-2.5 py-1.5 rounded-lg hover:bg-zinc-800 cursor-pointer"
                            >
                                Minimize to chat
                            </button>
                            {onCancel && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={isSubmitting}
                                    className="text-xs text-rose-400/80 hover:text-rose-300 transition px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 cursor-pointer disabled:opacity-40"
                                >
                                    Dismiss
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {submitSuccess ? (
                                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 px-4 py-2 bg-emerald-950/60 rounded-xl border border-emerald-800">
                                    <div className="w-4 h-4">{Icon.check}</div>
                                    Response Delivered!
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
                                            {hasQuestions && totalQuestions > 1 ? 'Delivering Answers…' : 'Sending…'}
                                        </span>
                                    ) : (
                                        hasQuestions && totalQuestions > 1 
                                            ? `Submit Answers (${answeredQuestions}/${totalQuestions})`
                                            : 'Submit Response'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
