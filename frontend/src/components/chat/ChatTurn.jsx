import React, { useState, memo } from 'react';
import { Icon } from '../../constants/icons';
import StreamItem from './StreamItem';
import MarkdownView from '../MarkdownView';
import { UserChatTurn } from './UserChatTurn';

const ChatTurn = memo(function ChatTurn({
  turn,
  turnIndex,
  openItemIds,
  approvals,
  onToggleItem,
  onApprove,
  onRespondQuestion,
  onOpenFile,
  onStop,
}) {
  const isUser = turn.role === 'user';
  const timeStr = turn.timestamp
    ? new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(turn.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (isUser) {
    return <UserChatTurn turn={turn} timeStr={timeStr} />;
  }

  let streamItems = turn.items;
  if (!streamItems || streamItems.length === 0) {
    streamItems = [];
    if (turn.thinking) {
      streamItems.push({
        id: 'th-synth',
        type: 'thought',
        title: 'Thought for 1s',
        text: turn.thinking,
      });
    }
    if (turn.steps) {
      turn.steps.forEach((s, sidx) => {
        streamItems.push({
          id: s.id || `act-${sidx}`,
          step_id: s.step_id,
          type: 'action',
          kind: s.kind || 'generic',
          verb:
            s.verb ||
            (s.kind === 'analyze'
              ? 'Analyzed'
              : s.kind === 'search'
                ? 'Searched'
                : s.kind === 'command'
                  ? 'Ran'
                  : s.kind === 'edit'
                    ? 'Edited'
                    : 'Used'),
          target: s.target || s.file_short || s.command || s.summary || s.name,
          command: s.command,
          cwd: s.cwd,
          cwd_short: s.cwd_short,
          file: s.file,
          extra: s.extra,
          status: s.status,
          requires_permission: s.requires_permission,
          requires_native_ide: s.requires_native_ide,
          permission_type: s.permission_type,
          permission_title: s.permission_title,
          permission_desc: s.permission_desc,
          approval_options: s.approval_options,
          approval_decision: s.approval_decision,
          question_data: s.question_data,
        });
      });
    }
  }

  const hasStream = streamItems.length > 0 || turn.is_working;

  return (
    <div className="chat-turn-item flex justify-start w-full min-w-0 max-w-full overflow-hidden">
      <div className="w-full min-w-0 rounded-xl bg-[#17191C]/90 border border-[#30343A] shadow-sm p-3.5 sm:p-4 text-xs sm:text-sm text-[#E8EAED] space-y-3 overflow-hidden break-words [overflow-wrap:anywhere]">
        <div className="flex items-center gap-2 pb-2 border-b border-[#262A30] text-xs text-[#A0A6AF]">
          <span
            className={`w-2 h-2 rounded-full ${turn.is_working ? 'bg-cyan-400 pulse-live ring-2 ring-cyan-400/30' : 'bg-emerald-400 ring-2 ring-emerald-400/20'}`}
          />
          <span className="font-semibold text-[#E8EAED] tracking-tight">Antigravity Agent</span>
          {turn.is_working && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              streaming
            </span>
          )}
          {timeStr && (
            <span className="text-[10px] text-[#747C87] font-mono tabular-nums ml-auto">
              {timeStr}
            </span>
          )}
        </div>

        {hasStream && (
          <div className="space-y-1.5 py-0.5 select-text">
            {streamItems.map((item, itemIdx) => {
              if (item.type === 'error' && item.error) {
                return (
                  <div
                    key={item.id || itemIdx}
                    className="my-2 p-3 rounded-xl bg-[#1C1416] border border-rose-500/40 text-xs font-sans space-y-2 select-text shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-rose-950/60 pb-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                        <div className="w-3.5 h-3.5 text-rose-400">{Icon.alertTriangle}</div>
                        <span>Agent Execution Error</span>
                      </div>
                      {item.error.error_id && (
                        <span className="text-[10px] font-mono text-rose-400/70">
                          ID: {item.error.error_id}
                        </span>
                      )}
                    </div>
                    <p className="text-[#C4C9D2] leading-relaxed">
                      {item.error.message ||
                        'There was a network issue connecting to the model server.'}
                    </p>
                    {item.error.raw_error && (
                      <div className="p-2 rounded bg-[#120D0F] border border-rose-950/80 font-mono text-[11px] text-rose-300/80 max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
                        {item.error.raw_error}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const textToCopy = item.error.raw_error || item.error.message;
                          navigator.clipboard.writeText(textToCopy);
                        }}
                        className="px-2.5 py-1 rounded bg-[#2A1B20] hover:bg-[#38232B] text-rose-300 text-[11px] font-mono transition cursor-pointer flex items-center gap-1"
                      >
                        <div className="w-3 h-3">{Icon.copy}</div>
                        <span>Copy Debug Info</span>
                      </button>
                    </div>
                  </div>
                );
              }

              if (item.type === 'comment' && item.text) {
                return (
                  <div
                    key={item.id || itemIdx}
                    className="my-2 px-3 py-2 rounded-lg bg-[#14171A] border-l-2 border-blue-500/60 text-xs text-[#E8EAED]"
                  >
                    <MarkdownView content={item.text} onOpenFile={onOpenFile} />
                  </div>
                );
              }

              const itemKey = item.step_id || `${turn.id || turnIndex}-${item.id || itemIdx}`;
              const isLiveExecuting =
                item.kind === 'command' &&
                item.exit_code === undefined &&
                (item.status !== 'done' || turn.is_working);
              return (
                <StreamItem
                  key={itemKey}
                  item={item}
                  itemKey={itemKey}
                  isOpen={openItemIds.has(itemKey) || isLiveExecuting}
                  approvalState={approvals[itemKey] || item.approval_decision}
                  isWorking={turn.is_working}
                  onToggle={onToggleItem}
                  onApprove={onApprove}
                  onRespondQuestion={onRespondQuestion}
                  onOpenFile={onOpenFile}
                />
              );
            })}

            {turn.is_working && (
              <div className="pt-1.5 space-y-1.5 font-sans">
                {turn.active_command ? (
                  <div className="flex select-none flex-row items-center justify-between gap-x-2 border border-blue-500/30 bg-[#101113] rounded-lg p-2 px-3 shadow-inner">
                    <div className="flex min-w-0 flex-1 items-center gap-x-2">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin shrink-0" />
                      <span className="break-all font-mono text-xs text-cyan-200 leading-relaxed">
                        {turn.active_command}
                      </span>
                    </div>
                    {onStop && (
                      <button
                        type="button"
                        onClick={onStop}
                        title="Cancel running command"
                        className="p-1 rounded hover:bg-rose-500/15 text-[#A0A6AF] hover:text-rose-400 transition cursor-pointer shrink-0"
                      >
                        <div className="w-3.5 h-3.5">{Icon.x}</div>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-cyan-400/90 text-xs py-0.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 pulse-live" />
                    <span>Working on solution...</span>
                  </div>
                )}
              </div>
            )}

            {/* Fallback turn error if not already rendered as a timeline item */}
            {turn.error && !streamItems.some(it => it.type === 'error') && (
              <div className="my-2 p-3 rounded-xl bg-[#1C1416] border border-rose-500/40 text-xs font-sans space-y-2 select-text shadow-sm">
                <div className="flex items-center justify-between gap-2 border-b border-rose-950/60 pb-1.5">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                    <div className="w-3.5 h-3.5 text-rose-400">{Icon.alertTriangle}</div>
                    <span>Agent Terminated Due to Error</span>
                  </div>
                  {turn.error.error_id && (
                    <span className="text-[10px] font-mono text-rose-400/70">
                      ID: {turn.error.error_id}
                    </span>
                  )}
                </div>
                <p className="text-[#C4C9D2] leading-relaxed">
                  {turn.error.message ||
                    'There was a network issue connecting to the model server.'}
                </p>
                {turn.error.raw_error && (
                  <div className="p-2 rounded bg-[#120D0F] border border-rose-950/80 font-mono text-[11px] text-rose-300/80 max-h-24 overflow-y-auto whitespace-pre-wrap break-all">
                    {turn.error.raw_error}
                  </div>
                )}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const textToCopy = turn.error.raw_error || turn.error.message;
                      navigator.clipboard.writeText(textToCopy);
                    }}
                    className="px-2.5 py-1 rounded bg-[#2A1B20] hover:bg-[#38232B] text-rose-300 text-[11px] font-mono transition cursor-pointer flex items-center gap-1"
                  >
                    <div className="w-3 h-3">{Icon.copy}</div>
                    <span>Copy Debug Info</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {turn.text && <MarkdownView content={turn.text} onOpenFile={onOpenFile} />}

        {turn.text && (
          <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-[#262A30] text-[#747C87]">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy response"
              className="p-1.5 rounded hover:text-emerald-400 hover:bg-[#1D2024] transition cursor-pointer flex items-center gap-1 text-[11px] font-mono"
            >
              {copied ? (
                <>
                  <div className="w-3.5 h-3.5 text-emerald-400">{Icon.check}</div>
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <div className="w-3.5 h-3.5">{Icon.copy}</div>
                  <span className="hidden group-hover:inline">Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default ChatTurn;
