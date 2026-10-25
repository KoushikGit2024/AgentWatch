import React from 'react';
import { Icon } from '../../constants/icons';

export default function PendingInteractionBanner({
    pendingInteraction,
    pendingApproval,
    selectedOptions,
    customResponse,
    isSubmitting,
    submitSuccess,
    onToggleOption,
    onChangeCustomResponse,
    onSubmit,
    onReopenInteraction,
    onCancelInteraction,
    onReopenApproval,
    onApprove
}) {
    if (!pendingInteraction && !pendingApproval) return null;

    if (pendingApproval && !pendingInteraction) {
        const reqType = pendingApproval.request_type || 'command';
        const target = pendingApproval.target || pendingApproval.command || '';
        const stepId = pendingApproval.step_id;
        return (
            <div className="mx-3 sm:mx-4 my-2 p-3.5 rounded-2xl bg-zinc-900/95 border border-amber-500/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                        <div className="w-4 h-4">{Icon.terminal}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full">
                                Command Approval Waiting
                            </span>
                        </div>
                        <p className="text-xs font-mono text-zinc-200 truncate mt-1">{target}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                        type="button"
                        onClick={() => onApprove(reqType, target, 'allow', stepId, '', 'Allow')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                        Allow
                    </button>
                    <button
                        type="button"
                        onClick={() => onApprove(reqType, target, 'always_allow', stepId, '', 'Always Allow')}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition cursor-pointer"
                    >
                        Always
                    </button>
                    <button
                        type="button"
                        onClick={() => onApprove(reqType, target, 'deny', stepId, '', 'Deny')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold transition cursor-pointer"
                    >
                        Deny
                    </button>
                    {onReopenApproval && (
                        <button
                            type="button"
                            onClick={onReopenApproval}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-medium transition cursor-pointer"
                        >
                            Options…
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-3 sm:mx-4 my-2 p-4 rounded-2xl bg-zinc-900/95 border border-blue-500/50 shadow-2xl shadow-blue-950/40 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                            <div className="w-4 h-4">{Icon.brain}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded-full">
                                    Agent Needs Decision
                                </span>
                            </div>
                            <h3 className="text-sm font-bold text-zinc-100 mt-1">{pendingInteraction.title}</h3>
                            {pendingInteraction.description && (
                                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{pendingInteraction.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {onReopenInteraction && (
                            <button
                                type="button"
                                onClick={onReopenInteraction}
                                className="px-2.5 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900/70 border border-blue-800 text-blue-300 text-[11px] font-semibold cursor-pointer"
                            >
                                Expand
                            </button>
                        )}
                        {onCancelInteraction && (
                            <button
                                type="button"
                                onClick={onCancelInteraction}
                                disabled={isSubmitting}
                                className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-rose-950/50 border border-zinc-700 hover:border-rose-800 text-zinc-400 hover:text-rose-300 text-[11px] font-medium transition cursor-pointer disabled:opacity-40"
                                title="Dismiss question"
                            >
                                Dismiss
                            </button>
                        )}
                    </div>
                </div>

                {/* Multiple choice options */}
                {pendingInteraction.options?.length > 0 && (
                    <div className="space-y-2 pt-1 max-h-48 overflow-y-auto">
                        {pendingInteraction.options.map((opt, idx) => {
                            const isSelected = selectedOptions.has(opt.id);
                            return (
                                <button
                                    key={opt.id || idx}
                                    type="button"
                                    onClick={() => onToggleOption(opt.id)}
                                    className={`w-full text-left flex items-start gap-3 p-2.5 rounded-xl border transition active:scale-[0.99] cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-950/60 border-blue-500 text-zinc-100 shadow-md shadow-blue-950/50'
                                            : 'bg-zinc-850 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                                    }`}
                                >
                                    <div className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center border shrink-0 transition text-[10px] font-bold ${
                                        isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                                    }`}>
                                        {isSelected ? <div className="w-3 h-3">{Icon.check}</div> : <span>{idx + 1}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-semibold text-zinc-100">{opt.label}</span>
                                            {opt.is_recommended && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
                                                    Recommended
                                                </span>
                                            )}
                                        </div>
                                        {opt.description && (
                                            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">{opt.description}</p>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Custom response input */}
                {pendingInteraction.allow_custom_response !== false && (
                    <div className="pt-1">
                        <input
                            type="text"
                            value={customResponse}
                            onChange={e => onChangeCustomResponse(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && (selectedOptions.size > 0 || customResponse.trim())) {
                                    e.preventDefault();
                                    onSubmit();
                                }
                            }}
                            placeholder="Or type something else to guide the agent..."
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none"
                        />
                    </div>
                )}

                {/* Submit button */}
                <div className="flex justify-end pt-1">
                    {submitSuccess ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 px-3.5 py-2 bg-emerald-950/60 rounded-xl border border-emerald-800">
                            <div className="w-3.5 h-3.5">{Icon.check}</div> Response Sent to Agent!
                        </div>
                    ) : (
                        <button
                            type="button"
                            disabled={isSubmitting || (selectedOptions.size === 0 && !customResponse.trim())}
                            onClick={onSubmit}
                            className="px-5 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md shadow-blue-900/40 cursor-pointer"
                        >
                            {isSubmitting ? 'Sending to Agent…' : 'Submit Response'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
