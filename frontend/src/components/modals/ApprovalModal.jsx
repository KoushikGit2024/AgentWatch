import React, { useState, useEffect } from 'react';
import { Icon } from '../../constants/icons';

export default function ApprovalModal({ approval, isSubmitting, onDecide, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);
  const [localDecision, setLocalDecision] = useState(null);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const approvalKey = approval ? approval.step_id || approval.target || approval.title : null;

  useEffect(() => {
    if (approval) {
      setLocalDecision(null);
      setCustomInstructions('');
      setShowCustomInput(false);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [approvalKey]);

  if (!approval) return null;

  const requestType = approval.request_type || 'command';
  const target = approval.target || approval.command || approval.file || approval.path || '';
  const title =
    approval.title ||
    `${requestType.charAt(0).toUpperCase() + requestType.slice(1)} Permission Request`;
  const description =
    approval.description ||
    approval.permission_desc ||
    'Antigravity is waiting for your confirmation before executing this action.';
  const isCommand = requestType === 'command' || Boolean(approval.command);
  const stepId = approval.step_id || approval.id;

  const defaultOptions = [
    { id: 'allow', label: 'Allow', description: 'Execute this action once' },
    ...(isCommand
      ? [
          {
            id: 'always_allow',
            label: 'Always Allow',
            description: 'Allow similar commands in this session',
          },
        ]
      : []),
    { id: 'deny', label: 'Deny', description: 'Reject this action' },
  ];
  const options =
    Array.isArray(approval.options) && approval.options.length > 0
      ? approval.options
      : defaultOptions;

  const handleDecide = async (decision, optionLabel = '', customText = '') => {
    if (isSubmitting || localDecision) return;
    const textToUse = (customText || customInstructions).trim();
    setLocalDecision(decision);
    try {
      const res = await onDecide(requestType, target, decision, stepId, textToUse, optionLabel);
      if (res && res.success === false) {
        setLocalDecision(null);
      }
    } catch {
      setLocalDecision(null);
    }
  };

  const handleSendCustomDeny = async () => {
    if (!customInstructions.trim() || isSubmitting || localDecision) return;
    await handleDecide('deny', 'Deny', customInstructions.trim());
  };

  const getButtonStyle = (optId, optLabel) => {
    const lower = `${optId} ${optLabel}`.toLowerCase();
    if (
      lower.includes('deny') ||
      lower.includes('reject') ||
      lower.includes('cancel') ||
      lower.includes('no')
    ) {
      return 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 shadow-sm hover:shadow-red-500/20';
    }
    if (lower.includes('always')) {
      return 'bg-[#1C2028] hover:bg-[#252B36] border border-[#3A4250] text-[#E2E8F0] hover:border-amber-400/40 shadow-sm';
    }
    return 'bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-[9998] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-150 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={!isSubmitting ? onDismiss : undefined}
      />

      <div className="relative w-full sm:max-w-md bg-[#16181E] border border-amber-500/30 rounded-t-2xl sm:rounded-2xl shadow-2xl shadow-amber-950/30 overflow-hidden max-h-[90dvh] flex flex-col">
        <div className="h-1 w-full shrink-0 bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]" />

        <div className="aw-modal-scroll-region p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-amber-500/40 bg-amber-500/15 text-amber-400 shrink-0 shadow-inner">
              <div className="w-4 h-4">
                {requestType === 'command'
                  ? Icon.terminal
                  : requestType === 'file'
                    ? Icon.file
                    : requestType === 'browser'
                      ? Icon.screen
                      : Icon.shield}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-xs">
                  {requestType.replace('_', ' ')}
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              </div>
              <h2 className="text-sm font-bold text-white mt-1.5 tracking-tight">{title}</h2>
              {description && (
                <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{description}</p>
              )}
            </div>
          </div>

          {target && (
            <div className="bg-[#0D1015]/90 border border-[#2B323F] rounded-xl p-3.5 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-amber-400/90 uppercase tracking-wider font-mono font-semibold">
                  {isCommand ? 'Terminal Command' : 'Target Resource'}
                </p>
              </div>
              <pre className="text-xs text-amber-100 font-mono whitespace-pre-wrap break-all leading-relaxed max-h-36 overflow-y-auto">
                {isCommand ? `$ ${target}` : target}
              </pre>
              {(approval.cwd || approval.cwd_short) && (
                <p className="text-[10px] text-[#64748B] font-mono truncate">
                  cwd: {approval.cwd || approval.cwd_short}
                </p>
              )}
            </div>
          )}

          {localDecision ? (
            <div
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold ${
                localDecision === 'deny'
                  ? 'bg-red-500/15 border-red-500/40 text-red-300 shadow-sm shadow-red-500/10'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
              }`}
            >
              <div className="w-4 h-4">{localDecision === 'deny' ? Icon.x : Icon.check}</div>
              <span>
                {localDecision === 'always_allow'
                  ? 'Always Allowed — Forwarded to IDE'
                  : localDecision === 'allow'
                    ? 'Allowed — Forwarded to IDE'
                    : customInstructions.trim()
                      ? 'Denied & Custom Instructions Sent'
                      : 'Denied — Forwarded to IDE'}
              </span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {options.map((opt, idx) => {
                  const optId = opt.id || `opt_${idx}`;
                  const optLabel = opt.label || optId;
                  const isDenyBtn = `${optId} ${optLabel}`
                    .toLowerCase()
                    .match(/deny|reject|cancel|no/);
                  return (
                    <button
                      key={optId}
                      type="button"
                      onClick={() => handleDecide(optId, optLabel)}
                      disabled={isSubmitting}
                      className={`flex-1 min-w-[90px] flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs transition cursor-pointer disabled:opacity-50 active:scale-[0.98] ${getButtonStyle(optId, optLabel)}`}
                    >
                      <div className="w-3.5 h-3.5 shrink-0">{isDenyBtn ? Icon.x : Icon.check}</div>
                      <span>{optLabel}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-[#2B323F] space-y-2">
                {!showCustomInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-[#1C2028] hover:bg-[#252B36] border border-[#3A4250] hover:border-amber-500/40 text-xs font-medium text-[#94A3B8] hover:text-white flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                  >
                    <span>Deny with custom instructions...</span>
                  </button>
                ) : (
                  <div className="space-y-2 bg-[#0D1015]/70 p-3 rounded-xl border border-[#2B323F]">
                    <label className="block text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                      Alternative instructions for the agent
                    </label>
                    <textarea
                      value={customInstructions}
                      onChange={e => setCustomInstructions(e.target.value)}
                      onKeyDown={e => {
                        if (
                          e.key === 'Enter' &&
                          (e.metaKey || e.ctrlKey) &&
                          customInstructions.trim()
                        ) {
                          e.preventDefault();
                          handleSendCustomDeny();
                        }
                      }}
                      placeholder="Specify what command or approach the agent should use instead..."
                      rows={2}
                      autoFocus
                      className="w-full bg-[#14171C] border border-[#3A4250] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 rounded-lg px-3 py-2 text-xs text-white placeholder-[#64748B] outline-none resize-none transition"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomInput(false);
                          setCustomInstructions('');
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs text-[#94A3B8] hover:text-white transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!customInstructions.trim() || isSubmitting}
                        onClick={handleSendCustomDeny}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition disabled:opacity-40 cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        Send Instructions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!localDecision && (
            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={onDismiss}
                className="text-[11px] text-[#747C87] hover:text-[#A0A6AF] transition cursor-pointer"
              >
                Minimize to chat stream
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
