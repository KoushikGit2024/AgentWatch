import React from 'react';
import { Check, CheckSquare, Square, CheckCircle2, Circle, CheckCircle } from 'lucide-react';

export function InteractionDrawer({
    interaction,
    isCollapsed,
    onToggleCollapse,
    selectedOptions,
    onToggleOption,
    customResponse,
    onChangeCustomResponse,
    isSubmitting,
    submitSuccess,
    onSubmit
}) {
    if (!interaction) return null;

    const isMulti = interaction.kind === 'multiple_choice';

    return (
        <div className="p-3 bg-zinc-900 border-t border-zinc-800 shrink-0 z-30 transition-all">
            <div className="bg-zinc-850 border border-zinc-750 rounded-lg p-3.5 shadow-sm">
                {/* Header with toggle */}
                <div
                    onClick={onToggleCollapse}
                    className="flex items-center justify-between gap-2 cursor-pointer select-none"
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 shrink-0">
                            {(interaction.kind || 'CHOICE').replace('_', ' ')}
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-100 truncate">{interaction.title}</h3>
                    </div>
                    <button
                        type="button"
                        className="p-1 text-zinc-400 hover:text-zinc-200 transition shrink-0"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>
                </div>

                {/* Collapsible Content */}
                {!isCollapsed && (
                    <div className="mt-3 space-y-3">
                        {interaction.description && (
                            <p className="text-xs text-zinc-400 leading-relaxed">{interaction.description}</p>
                        )}

                        {/* Option Pills */}
                        {interaction.options && interaction.options.length > 0 && (
                            <div className="space-y-2">
                                {interaction.options.map(opt => {
                                    const isSelected = selectedOptions.has(opt.id);
                                    return (
                                        <div
                                            key={opt.id}
                                            onClick={() => onToggleOption(opt.id)}
                                            className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer transition select-none ${
                                                isSelected
                                                    ? 'bg-blue-950/30 border-blue-600/80 text-zinc-100'
                                                    : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                                            }`}
                                        >
                                            <div className={`mt-0.5 ${isSelected ? 'text-blue-500' : 'text-zinc-500'}`}>
                                                {isMulti ? (
                                                    isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />
                                                ) : (
                                                    isSelected ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                                                    {opt.label}
                                                    {opt.is_recommended && (
                                                        <span className="text-[9.5px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            Recommended
                                                        </span>
                                                    )}
                                                </div>
                                                {opt.description && (
                                                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">{opt.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Custom Response Textarea */}
                        {interaction.allow_custom_response && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-zinc-400">
                                    {interaction.custom_response_label || 'Other Response:'}
                                </label>
                                <input
                                    type="text"
                                    value={customResponse}
                                    onChange={e => onChangeCustomResponse(e.target.value)}
                                    placeholder="Enter custom guidance..."
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                                />
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end pt-1">
                            {submitSuccess ? (
                                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium py-1.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    <span>Response Submitted Successfully</span>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={onSubmit}
                                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Response'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
