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
  onCancel,
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
    ? interaction.questions.filter(
        q => q.options && q.options.some(opt => selectedOptions.has(opt.id))
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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
        onClick={!isSubmitting ? onCancel || onDismiss : undefined}
      />

      <div className="relative w-full sm:max-w-lg bg-gradient-to-b from-[#181D26] to-[#12151B] border border-sky-500/30 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-sky-950/40 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.5)]" />

        <div className="aw-modal-scroll-region overflow-y-auto max-h-[86dvh] p-4 sm:p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/15 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
                <div className="w-5 h-5">{Icon.cpu}</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-300 bg-sky-500/15 border border-sky-500/35 px-2 py-0.5 rounded-full shadow-xs">
                    {interaction.popup_kind === 'browser_permission'
                      ? 'Browser Permission'
                      : interaction.type === 'approval'
                        ? 'Command Approval'
                        : 'Agent Question'}
                  </span>
                  {hasQuestions && (
                    <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-full bg-[#1C2028] border border-[#3A4250] text-[#94A3B8]">
                      {answeredQuestions}/{totalQuestions} Answered
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-bold text-white mt-1.5 leading-snug tracking-tight">
                  {interaction.title}
                </h2>
                {interaction.target_domain && (
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#0D1015] border border-sky-500/30 text-xs font-mono text-sky-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                    <span>
                      Target: <strong className="text-white">{interaction.target_domain}</strong>
                    </span>
                  </div>
                )}
                {interaction.description && (
                  <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                    {interaction.description}
                  </p>
                )}
                {interaction.command && (
                  <div className="mt-2 p-2.5 rounded-xl bg-[#0D1015]/90 border border-emerald-500/30 font-mono text-xs text-emerald-300 overflow-x-auto shadow-inner">
                    <code>{interaction.command}</code>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onCancel || onDismiss}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#252B36] transition cursor-pointer shrink-0 disabled:opacity-40"
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
                        <h3 className="text-xs font-semibold text-[#E8EAED] leading-snug">
                          {q.question}
                        </h3>
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
                            className={`w-full text-left flex items-start gap-2.5 p-3 rounded-xl border transition text-xs cursor-pointer ${
                              isSelected
                                ? 'bg-sky-500/15 border-sky-400 text-white shadow-sm shadow-sky-500/20'
                                : 'bg-[#151921] border-[#2E3644] hover:border-sky-500/40 text-[#94A3B8] hover:text-white'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 mt-0.5 ${q.is_multi_select ? 'rounded-xs' : 'rounded-full'} flex items-center justify-center border shrink-0 text-[9px] font-mono ${
                                isSelected
                                  ? 'bg-sky-500 border-sky-400 text-[#091512] font-bold shadow-xs'
                                  : 'border-[#3A4250] bg-[#0E1117] text-[#64748B]'
                              }`}
                            >
                              {isSelected ? (
                                <div className="w-2.5 h-2.5">{Icon.check}</div>
                              ) : (
                                <span>{optIdx + 1}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-white">{opt.label}</span>
                                {opt.is_recommended && (
                                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                                    Recommended
                                  </span>
                                )}
                              </div>
                              {opt.description && (
                                <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
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
            hasOptions && (
              <div className="space-y-2">
                {interaction.options.map((opt, idx) => {
                  const isSelected = selectedOptions.has(opt.id);
                  return (
                    <button
                      key={opt.id || idx}
                      type="button"
                      onClick={() => onToggleOption(opt.id)}
                      className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-400 shadow-sm shadow-sky-500/20'
                          : 'bg-[#151921] border-[#2E3644] hover:border-sky-500/40'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 mt-0.5 ${isMulti ? 'rounded-xs' : 'rounded-full'} flex items-center justify-center border shrink-0 text-[10px] font-mono ${
                          isSelected
                            ? 'bg-sky-500 border-sky-400 text-[#091512] font-bold shadow-xs'
                            : 'border-[#3A4250] bg-[#1C2028] text-[#94A3B8]'
                        }`}
                      >
                        {isSelected ? (
                          <div className="w-3 h-3">{Icon.check}</div>
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-white">
                            {opt.label}
                          </span>
                          {opt.is_recommended && (
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                              Recommended
                            </span>
                          )}
                        </div>
                        {opt.description && (
                          <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-relaxed">
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
                    className="w-full text-left flex items-center gap-2.5 p-3 rounded-xl border border-dashed border-[#3A4250] hover:border-sky-400 bg-[#12151B] text-[#94A3B8] hover:text-white transition cursor-pointer"
                  >
                    <div className="w-4 h-4 text-sky-400 shrink-0">{Icon.plus}</div>
                    <span className="text-xs font-medium">Provide custom instructions...</span>
                  </button>
                )}
              </div>
            )
          )}

          {interaction.allow_custom_response !== false &&
            (useCustomMode || !hasOptions || customResponse.length > 0) && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-semibold text-sky-400 uppercase tracking-wider">
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
                  className="w-full bg-[#0E1117] border border-[#3A4250] focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-[#64748B] outline-none resize-none transition"
                />
              </div>
            )}

          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-[#2B323F]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDismiss}
                className="text-xs text-[#94A3B8] hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-[#252B36] cursor-pointer"
              >
                Minimize
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="text-xs text-rose-400 hover:bg-rose-500/15 transition px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-40"
                >
                  Dismiss
                </button>
              )}
            </div>

            <div>
              {submitSuccess ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300 px-4 py-2 bg-emerald-500/15 rounded-xl border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
                  <div className="w-3.5 h-3.5">{Icon.check}</div>
                  <span>Response Delivered</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || !canSubmit}
                  onClick={onSubmit}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-[#091512] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-sky-500/25 active:scale-[0.98]"
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
