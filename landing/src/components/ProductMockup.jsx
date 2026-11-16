import React, { useState } from 'react';
import {
  ShieldCheck,
  MessageSquare,
  GitBranch,
  Check,
  X,
  Send,
  Lock,
  Terminal,
} from 'lucide-react';

export default function ProductMockup() {
  const [activeTab, setActiveTab] = useState('approval');
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [selectedQuestionChoice, setSelectedQuestionChoice] = useState(0);

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border-default bg-bg-surface p-2 shadow-2xl transition-all">
      {/* Device Top Bezel & Status: Static solid badges, zero pulsating glow */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle text-[11px] font-mono text-text-muted">
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded bg-status-success/15 px-1.5 py-0.5 text-[10px] text-status-success font-medium border border-status-success/30">
            <Lock className="h-2.5 w-2.5" />
            <span>Tailscale</span>
          </span>
        </div>
        <div className="flex items-center gap-1 text-text-secondary">
          <Terminal className="h-3 w-3 text-accent" />
          <span>Antigravity :9000</span>
        </div>
      </div>

      {/* Interactive Scenario Switcher */}
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-bg-app p-1 text-[11px] font-mono">
        <button
          onClick={() => {
            setActiveTab('approval');
            setApprovalStatus(null);
          }}
          className={`flex items-center justify-center gap-1 rounded py-1.5 transition-all ${
            activeTab === 'approval'
              ? 'bg-bg-elevated font-semibold text-status-warning shadow-sm border border-border-default'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <ShieldCheck className="h-3 w-3" />
          <span>Approval</span>
        </button>

        <button
          onClick={() => setActiveTab('question')}
          className={`flex items-center justify-center gap-1 rounded py-1.5 transition-all ${
            activeTab === 'question'
              ? 'bg-bg-elevated font-semibold text-accent shadow-sm border border-border-default'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <MessageSquare className="h-3 w-3" />
          <span>Choice</span>
        </button>

        <button
          onClick={() => setActiveTab('diff')}
          className={`flex items-center justify-center gap-1 rounded py-1.5 transition-all ${
            activeTab === 'diff'
              ? 'bg-bg-elevated font-semibold text-status-success shadow-sm border border-border-default'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <GitBranch className="h-3 w-3" />
          <span>Diff</span>
        </button>
      </div>

      {/* Mock Screen Content Viewport */}
      <div className="mt-2 min-h-[300px] rounded-xl border border-border-subtle bg-bg-app p-3">
        {activeTab === 'approval' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="inline-flex items-center gap-1 rounded border border-status-warning/40 bg-status-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-status-warning">
                PAUSED
              </span>
              <span className="text-text-muted">Turn #7</span>
            </div>

            {/* Approval Card */}
            <div className="rounded-lg border border-border-default bg-bg-surface p-2.5 text-xs">
              <div className="text-[11px] text-text-secondary mb-1.5 font-mono">
                $ bash -c "pytest tests/system -v"
              </div>
              <div className="rounded bg-bg-code p-2 font-mono text-[11px] text-text-primary border border-border-subtle">
                <span className="text-text-muted">SafeToAutoRun:</span>{' '}
                <span className="text-status-warning font-semibold">False</span>
                <br />
                <span className="text-text-muted">Directory:</span> /d/AgentWatch/tests
              </div>

              {approvalStatus ? (
                <div
                  className={`mt-2.5 flex items-center justify-center gap-1.5 rounded py-2 text-xs font-mono border ${
                    approvalStatus.includes('Allow')
                      ? 'bg-status-success/15 border-status-success/40 text-status-success'
                      : 'bg-status-error/15 border-status-error/40 text-status-error'
                  }`}
                >
                  {approvalStatus.includes('Allow') ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                  <span>{approvalStatus}</span>
                </div>
              ) : (
                <div className="mt-3 flex gap-1.5">
                  <button
                    onClick={() => setApprovalStatus('Approved: Allow')}
                    className="flex-1 flex items-center justify-center gap-1 rounded bg-status-success/20 border border-status-success/40 py-1.5 text-xs font-semibold text-status-success hover:bg-status-success/30 active:scale-[0.98] transition-all"
                  >
                    <Check className="h-3 w-3" />
                    <span>Allow</span>
                  </button>
                  <button
                    onClick={() => setApprovalStatus('Denied by User')}
                    className="flex-1 flex items-center justify-center gap-1 rounded bg-status-error/15 border border-status-error/40 py-1.5 text-xs font-semibold text-status-error hover:bg-status-error/25 active:scale-[0.98] transition-all"
                  >
                    <X className="h-3 w-3" />
                    <span>Deny</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-surface px-2.5 py-1.5 text-[11px] text-text-muted">
              <input
                type="text"
                disabled
                placeholder="Or deny with alternative instructions..."
                className="w-full bg-transparent outline-none text-text-secondary placeholder:text-text-muted font-mono"
              />
              <Send className="h-3 w-3 text-text-muted" />
            </div>
          </div>
        )}

        {activeTab === 'question' && (
          <div className="space-y-3">
            <div className="text-[11px] font-mono text-accent font-medium">
              Agent Disambiguation Prompt:
            </div>
            <div className="text-xs text-text-primary font-medium">
              Which auth provider should we integrate first?
            </div>

            <div className="space-y-1.5">
              {[
                {
                  title: 'Tailscale Auth (Recommended)',
                  sub: 'Zero-config tailnet node verification',
                },
                { title: 'Local Session Key', sub: 'Simple bearer token header' },
              ].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedQuestionChoice(i)}
                  className={`w-full flex items-center justify-between rounded-lg border p-2 text-left text-xs transition-all ${
                    selectedQuestionChoice === i
                      ? 'border-accent bg-accent/15 text-text-primary shadow-sm'
                      : 'border-border-default bg-bg-surface text-text-secondary hover:border-border-strong'
                  }`}
                >
                  <div>
                    <div className="font-medium text-text-primary">{opt.title}</div>
                    <div className="text-[10px] text-text-muted">{opt.sub}</div>
                  </div>
                  <div
                    className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                      selectedQuestionChoice === i
                        ? 'border-accent bg-accent'
                        : 'border-border-strong'
                    }`}
                  >
                    {selectedQuestionChoice === i && (
                      <div className="h-1.5 w-1.5 rounded-full bg-bg-app"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="text-[10px] text-center font-mono text-text-muted">
              Dispatches CDP response event to IDE
            </div>
          </div>
        )}

        {activeTab === 'diff' && (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
              <span className="text-text-secondary">services/networking/tailscale_service.py</span>
              <div className="flex items-center gap-1.5 font-semibold">
                <span className="text-status-success">+18</span>
                <span className="text-status-error">-2</span>
              </div>
            </div>

            <div className="rounded-lg border border-border-subtle bg-bg-code p-2 font-mono text-[11px] space-y-0.5 leading-relaxed overflow-x-auto">
              <div className="text-text-muted">@@ -24,4 +24,6 @@</div>
              <div className="text-text-secondary"> def verify_peer():</div>
              <div className="text-status-error bg-status-error/15 px-1 rounded font-medium">
                - pass
              </div>
              <div className="text-status-success bg-status-success/15 px-1 rounded font-medium">
                + node = tailscale.get_peer()
              </div>
              <div className="text-status-success bg-status-success/15 px-1 rounded font-medium">
                + return node.is_authenticated
              </div>
              <div className="text-text-secondary"> def logout():</div>
            </div>

            <div className="text-[10px] text-center font-mono text-text-muted pt-1">
              Tap turn to expand full unified diff viewer
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
