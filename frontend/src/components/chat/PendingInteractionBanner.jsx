import React from 'react';
import { Icon } from '../../constants/icons';

export default function PendingInteractionBanner({
    pendingInteraction,
    selectedOptions,
    customResponse,
    isSubmitting,
    submitSuccess,
    onToggleOption,
    onChangeCustomResponse,
    onSubmit
}) {
    if (!pendingInteraction) return null;

    return (
        <div className="mx-4 my-2 p-4 rounded-2xl bg-zinc-900/95 border border-blue-500/50 shadow-2xl shadow-blue-950/40 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="space-y-3">
                <div className="flex items-start gap-3">
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

                {/* Multiple choice options */}
                {pendingInteraction.options?.length > 0 && (
                    <div className="space-y-2 pt-1">
                        {pendingInteraction.options.map(opt => {
                            const isSelected = selectedOptions.has(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => onToggleOption(opt.id)}
                                    className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition active:scale-[0.99] cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-950/60 border-blue-500 text-zinc-100 shadow-md shadow-blue-950/50'
                                            : 'bg-zinc-850 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                                    }`}
                                >
                                    <div className={`w-5 h-5 mt-0.5 rounded-full flex items-center justify-center border shrink-0 transition ${
                                        isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'border-zinc-700 bg-zinc-900'
                                    }`}>
                                        {isSelected ? <div className="w-3 h-3">{Icon.check}</div> : null}
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
                {pendingInteraction.allow_custom_response && (
                    <div className="pt-1">
                        <input
                            type="text"
                            value={customResponse}
                            onChange={e => onChangeCustomResponse(e.target.value)}
                            placeholder="Or type a custom response to guide the agent..."
                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none"
                        />
                    </div>
                )}

                {/* Submit button */}
                <div className="flex justify-end pt-2">
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
