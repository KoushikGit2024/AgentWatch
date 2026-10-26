import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../constants/icons';

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
            role="dialog"
            aria-modal="true"
            aria-label={interaction.title || 'Agent Decision Request'}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
            <div
                className="absolute inset-0 bg-black/75 cursor-pointer"
                onClick={!isSubmitting ? (onCancel || onDismiss) : undefined}
            />

            <div className="relative w-full sm:max-w-lg bg-[#17191C] border border-[#30343A] rounded-t-xl sm:rounded-lg shadow-2xl overflow-hidden">
                <div className="h-0.5 w-full bg-[#7C9FC5]" />

                <div className="aw-modal-scroll-region overflow-y-auto max-h-[86dvh] p-4 sm:p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-md bg-[#7C9FC5]/12 border border-[#7C9FC5]/35 flex items-center justify-center text-[#7C9FC5] shrink-0">
                                <div className="w-4 h-4">{Icon.cpu}</div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7C9FC5] bg-[#7C9FC5]/12 border border-[#7C9FC5]/35 px-2 py-0.5 rounded">
                                        {interaction.popup_kind === 'browser_permission' ? 'Browser Permission' : interaction.type === 'approval' ? 'Command Approval' : 'Agent Question'}
                                    </span>
                                    {hasQuestions && (
                                        <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded bg-[#1D2024] border border-[#30343A] text-[#A0A6AF]">
                                            {answeredQuestions}/{totalQuestions} Answered
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-sm sm:text-base font-semibold text-[#E8EAED] mt-1.5 leading-snug">
                                    {interaction.title}
                                </h2>
                                {interaction.target_domain && (
                                    <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#101113] border border-[#30343A] text-xs font-mono text-[#7C9FC5]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#79B89A]" />
                                        <span>Target: <strong>{interaction.target_domain}</strong></span>
                                    </div>
                                )}
                                {interaction.description && (
                                    <p className="text-xs text-[#A0A6AF] mt-1 leading-relaxed">
                                        {interaction.description}
                                    </p>
                                )}
                                {interaction.command && (
                                    <div className="mt-2 p-2.5 rounded-md bg-[#101113] border border-[#30343A] font-mono text-xs text-[#79B89A] overflow-x-auto">
                                        <code>{interaction.command}</code>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onCancel || onDismiss}
                            disabled={isSubmitting}
                            className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer shrink-0 disabled:opacity-40"
                            title="Dismiss Question"
                            aria-label="Dismiss Question"
                        >
                            <div className="w-4 h-4">{Icon.x}</div>
                        </button>
                    </div>

                    {hasQuestions ? (
                        <div className="space-y-3">
                            {interaction.questions.map((q, qIdx) => {
                                const qAnswered = (q.options || []).some(opt => selectedOptions.has(opt.id));
                                return (
                                    <div
                                        key={q.id || qIdx}
                                        className={`p-3 rounded-lg border space-y-2 transition ${
                                            qAnswered
                                                ? 'bg-[#79B89A]/10 border-[#79B89A]/40'
                                                : 'bg-[#101113] border-[#30343A]'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-[#17191C] border border-[#30343A] text-[#A0A6AF] shrink-0">
                                                    Q{qIdx + 1}/{totalQuestions}
                                                </span>
                                                <h3 className="text-xs font-semibold text-[#E8EAED] leading-snug">{q.question}</h3>
                                            </div>
                                            {qAnswered && (
                                                <div className="shrink-0 w-4 h-4 text-[#79B89A]">{Icon.check}</div>
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            {(q.options || []).map((opt, optIdx) => {
                                                const isSelected = selectedOptions.has(opt.id);
                                                return (
                                                    <button
                                                        key={opt.id || optIdx}
                                                        type="button"
                                                        onClick={() => onToggleOption(opt.id, q)}
                                                        className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-md border transition text-xs cursor-pointer ${
                                                            isSelected
                                                                ? 'bg-[#7C9FC5]/15 border-[#7C9FC5] text-[#E8EAED]'
                                                                : 'bg-[#17191C] border-[#30343A] hover:border-[#40464F] text-[#A0A6AF]'
                                                        }`}
                                                    >
                                                        <div className={`w-4 h-4 mt-0.5 ${q.is_multi_select ? 'rounded-xs' : 'rounded-full'} flex items-center justify-center border shrink-0 text-[9px] font-mono ${
                                                            isSelected
                                                                ? 'bg-[#7C9FC5] border-[#7C9FC5] text-[#101113] font-bold'
                                                                : 'border-[#30343A] bg-[#101113] text-[#747C87]'
                                                        }`}>
                                                            {isSelected ? <div className="w-2.5 h-2.5">{Icon.check}</div> : <span>{optIdx + 1}</span>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-semibold text-[#E8EAED]">{opt.label}</span>
                                                                {opt.is_recommended && (
                                                                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-[#79B89A]/15 border border-[#79B89A]/40 text-[#79B89A]">
                                                                        Recommended
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {opt.description && (
                                                                <p className="text-[11px] text-[#A0A6AF] mt-0.5 leading-relaxed">{opt.description}</p>
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
                        hasOptions && (
                            <div className="space-y-2">
                                {interaction.options.map((opt, idx) => {
                                    const isSelected = selectedOptions.has(opt.id);
                                    return (
                                        <button
                                            key={opt.id || idx}
                                            type="button"
                                            onClick={() => onToggleOption(opt.id)}
                                            className={`w-full text-left flex items-start gap-3 p-3 rounded-md border transition cursor-pointer ${
                                                isSelected
                                                    ? 'bg-[#7C9FC5]/15 border-[#7C9FC5]'
                                                    : 'bg-[#101113] border-[#30343A] hover:border-[#40464F]'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 mt-0.5 ${isMulti ? 'rounded-xs' : 'rounded-full'} flex items-center justify-center border shrink-0 text-[10px] font-mono ${
                                                isSelected
                                                    ? 'bg-[#7C9FC5] border-[#7C9FC5] text-[#101113] font-bold'
                                                    : 'border-[#30343A] bg-[#17191C] text-[#A0A6AF]'
                                            }`}>
                                                {isSelected ? <div className="w-3 h-3">{Icon.check}</div> : <span>{idx + 1}</span>}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs sm:text-sm font-semibold text-[#E8EAED]">
                                                        {opt.label}
                                                    </span>
                                                    {opt.is_recommended && (
                                                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[#79B89A]/15 border border-[#79B89A]/40 text-[#79B89A]">
                                                            Recommended
                                                        </span>
                                                    )}
                                                </div>
                                                {opt.description && (
                                                    <p className="text-[11px] text-[#A0A6AF] mt-0.5 leading-relaxed">
                                                        {opt.description}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}

                                {interaction.allow_custom_response !== false && !useCustomMode && (
                                    <button
                                        type="button"
                                        onClick={handleSelectCustomMode}
                                        className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-md border border-dashed border-[#30343A] hover:border-[#7C9FC5] bg-[#101113] text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer"
                                    >
                                        <div className="w-4 h-4 text-[#7C9FC5] shrink-0">{Icon.plus}</div>
                                        <span className="text-xs font-medium">Provide custom instructions...</span>
                                    </button>
                                )}
                            </div>
                        )
                    )}

                    {(interaction.allow_custom_response !== false && (useCustomMode || !hasOptions || customResponse.length > 0)) && (
                        <div className="space-y-1.5 pt-1">
                            <label className="block text-[11px] font-semibold text-[#A0A6AF] uppercase tracking-wider">
                                {interaction.custom_response_label || 'Custom instructions'}
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
                                placeholder="Type your own answer or instructions for the agent..."
                                rows={3}
                                className="w-full bg-[#101113] border border-[#30343A] focus:border-[#7C9FC5] rounded-md px-3 py-2 text-xs sm:text-sm text-[#E8EAED] placeholder-[#747C87] outline-none resize-none"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#262A30]">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onDismiss}
                                className="text-xs text-[#A0A6AF] hover:text-[#E8EAED] transition px-2.5 py-1.5 rounded hover:bg-[#1D2024] cursor-pointer"
                            >
                                Minimize
                            </button>
                            {onCancel && (
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    disabled={isSubmitting}
                                    className="text-xs text-[#D77E83] hover:bg-[#D77E83]/15 transition px-2.5 py-1.5 rounded cursor-pointer disabled:opacity-40"
                                >
                                    Dismiss
                                </button>
                            )}
                        </div>

                        <div>
                            {submitSuccess ? (
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#79B89A] px-3.5 py-2 bg-[#79B89A]/15 rounded-md border border-[#79B89A]/40">
                                    <div className="w-3.5 h-3.5">{Icon.check}</div>
                                    <span>Response Delivered</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isSubmitting || !canSubmit}
                                    onClick={onSubmit}
                                    className="px-4 py-2 text-xs font-semibold rounded-md bg-[#7C9FC5] hover:bg-[#8FB0D4] text-[#101113] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {isSubmitting
                                        ? 'Sending...'
                                        : hasQuestions && totalQuestions > 1
                                            ? `Submit Answers (${answeredQuestions}/${totalQuestions})`
                                            : 'Submit Response'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
