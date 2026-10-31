import React, { useState } from 'react';
import { Icon } from '../../constants/icons';

export default function QuestionCard({
  item,
  isWorking = false,
  onRespond,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvedDecision, setResolvedDecision] = useState(item?.approval_decision || null);

  const qData = item?.question_data;
  if (!qData) return null;

  const isMulti = Boolean(qData.is_multi_select);
  const rawOptions = Array.isArray(qData.options) ? qData.options : [];
  const options = rawOptions.map((opt, i) => {
    if (typeof opt === 'string') {
      const isRec = opt.toLowerCase().includes('(recommended)');
      return { id: `opt_${i}`, label: opt, is_recommended: isRec };
    }
    return {
      id: opt.id || `opt_${i}`,
      label: opt.label || `Option ${i + 1}`,
      description: opt.description || null,
      is_recommended: Boolean(opt.is_recommended),
    };
  });

  const isResolved = Boolean(resolvedDecision || item?.status === 'done' || item?.requires_permission === false);

  const toggleOption = (id) => {
    if (isResolved || isSubmitting) return;
    if (isMulti) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
  };

  const handleSendResponse = async (explicitOption = null) => {
    if (isSubmitting || isResolved) return;

    let chosenLabels = [];
    if (explicitOption) {
      chosenLabels = [explicitOption.label];
    } else {
      chosenLabels = options
        .filter(opt => selectedIds.has(opt.id))
        .map(opt => opt.label);
    }

    if (chosenLabels.length === 0 && !customText.trim()) return;

    setIsSubmitting(true);
    try {
      if (onRespond) {
        await onRespond(chosenLabels, customText.trim() || null);
      }
      setResolvedDecision(chosenLabels.join(', ') || customText.trim());
    } catch {
      // Handled via toast in onRespond
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-2 mb-2 p-3.5 sm:p-4 rounded-xl bg-[#121417] border border-blue-500/35 shadow-lg space-y-3 select-text">
      {/* Header */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
            <div className="w-3.5 h-3.5">{Icon.brain}</div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-950/70 border border-blue-800/60 px-2 py-0.5 rounded-full font-mono">
                {isMulti ? 'Multi-Choice Question' : 'Agent Question'}
              </span>
              {isResolved && (
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <div className="w-2.5 h-2.5">{Icon.check}</div>
                  <span>Answered</span>
                </span>
              )}
            </div>
            <h4 className="text-xs sm:text-sm font-semibold text-[#E8EAED] mt-1.5 leading-snug">
              {qData.question || qData.title || item.target || 'Agent Question'}
            </h4>
          </div>
        </div>
      </div>

      {/* Options list */}
      <div className="space-y-1.5 pt-1">
        {options.map((opt, idx) => {
          const isSelected = selectedIds.has(opt.id);
          return (
            <div
              key={opt.id}
              onClick={() => toggleOption(opt.id)}
              className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border text-xs transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-950/50 border-blue-500/80 text-[#E8EAED] shadow-sm'
                  : 'bg-[#181A1E] border-[#2A2E35] hover:border-[#3E444E] text-[#C4C9D2]'
              } ${isResolved ? 'opacity-70 cursor-default' : ''}`}
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <div
                  className={`w-4 h-4 mt-0.5 ${isMulti ? 'rounded' : 'rounded-full'} border flex items-center justify-center shrink-0 text-[10px] font-bold transition ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-[#404652] bg-[#121417] text-[#747C87]'
                  }`}
                >
                  {isSelected ? <div className="w-2.5 h-2.5">{Icon.check}</div> : idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[11px] sm:text-xs">{opt.label}</span>
                    {opt.is_recommended && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 font-mono">
                        Recommended
                      </span>
                    )}
                  </div>
                  {opt.description && (
                    <p className="text-[10px] text-[#8C93A0] mt-0.5 leading-relaxed">{opt.description}</p>
                  )}
                </div>
              </div>

              {!isResolved && !isMulti && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSendResponse(opt);
                  }}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-[11px] transition shrink-0 cursor-pointer shadow-xs"
                >
                  {isSubmitting && isSelected ? 'Sending...' : 'Select'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom input toggle & actions */}
      {!isResolved && (
        <div className="pt-1 border-t border-[#22262C] space-y-2">
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="text-[11px] font-mono text-sky-400 hover:text-sky-300 transition flex items-center gap-1 cursor-pointer"
            >
              <div className="w-3 h-3">{Icon.edit}</div>
              <span>Type custom instructions instead...</span>
            </button>
          ) : (
            <div className="space-y-1.5">
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Type specific directions for the agent..."
                className="w-full px-3 py-1.5 rounded-lg bg-[#0F1012] border border-[#30343A] text-xs text-[#E8EAED] placeholder-[#747C87] outline-none focus:border-blue-500/70"
              />
            </div>
          )}

          {(isMulti || showCustomInput) && (
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting || (selectedIds.size === 0 && !customText.trim())}
                onClick={() => handleSendResponse()}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Sending...' : 'Submit Choice'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

