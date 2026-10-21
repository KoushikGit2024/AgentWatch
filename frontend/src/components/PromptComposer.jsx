import React from 'react';
import { Icon } from '../constants/icons';

export function PromptComposer({
    promptText,
    onChangePrompt,
    onSend,
    isSending,
    isWorking = false,
    appState,
    onOpenModelModal,
    onOpenReviewChanges,
    onOpenLogs,
    onOpenRecovery,
    onToggleViewMode,
    viewMode,
    recoveryCount = 0,
    onStop
}) {
    const quickActions = ['Continue working', 'Explain what you did', 'Fix latest bug', 'Summarize progress'];

    return (
        <div className="p-3 md:p-4 bg-zinc-900/90 border-t border-zinc-800 shrink-0 pb-safe select-none">
            <div className="max-w-3xl mx-auto w-full space-y-2">
                {/* Quick Suggestion Chips */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    {quickActions.map(action => (
                        <button
                            key={action}
                            type="button"
                            onClick={() => onChangePrompt(action)}
                            className="text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-750 px-3 py-1 rounded-full border border-zinc-750 transition shrink-0 active:scale-95 cursor-pointer"
                        >
                            {action}
                        </button>
                    ))}
                </div>

                {/* Antigravity Control Row (Files, Terminal, Screen, Recovery & Review Changes) */}
                <div className="flex items-center justify-between px-1 text-xs pt-0.5">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onOpenReviewChanges}
                            title="Inspect modified workspace files"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.file}</div>
                        </button>
                        <button
                            type="button"
                            onClick={onOpenLogs}
                            title="Terminal & System Logs"
                            className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.terminal}</div>
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        </button>
                        <button
                            type="button"
                            onClick={onToggleViewMode}
                            title="Toggle Workspace Viewport"
                            className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.screen}</div>
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
                        </button>
                        <button
                            type="button"
                            onClick={onOpenRecovery}
                            title="Recovery Center & Safeguards"
                            className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.shield}</div>
                            {recoveryCount > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            )}
                        </button>
                    </div>

                    {/* Review Changes Pill Button */}
                    <button
                        type="button"
                        onClick={onOpenReviewChanges}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750/90 text-xs font-medium transition active:scale-95 shadow-sm cursor-pointer"
                    >
                        <div className="w-3.5 h-3.5 text-zinc-400">{Icon.file}</div>
                        <span>Review Changes</span>
                    </button>
                </div>

                {/* Rounded Composer Card */}
                <div className="rounded-2xl bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 p-3 shadow-lg transition">
                    <textarea
                        value={promptText}
                        onChange={e => onChangePrompt(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSend();
                            }
                        }}
                        placeholder="Ask anything, @ to mention, / for actions…"
                        rows={2}
                        className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none max-h-36 leading-relaxed select-text"
                    />

                    {/* Bottom controls row inside composer */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-xs">
                        <div className="flex items-center gap-2">
                            {/* Model Selector Pill */}
                            <button
                                type="button"
                                onClick={onOpenModelModal}
                                title={appState?.model ? `Active Model: ${appState.model}` : 'Detecting active plan model…'}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 transition active:scale-95 cursor-pointer max-w-[260px]"
                            >
                                <div className="w-3.5 h-3.5 text-blue-400 shrink-0">{Icon.sparkles}</div>
                                <span className="truncate text-xs font-medium">
                                    {appState?.model || 'Detecting plan model…'}
                                </span>
                                <div className="w-3 h-3 text-zinc-500 shrink-0">{Icon.chevronDown}</div>
                            </button>
                        </div>

                        {/* Dynamic Send / Stop Controls */}
                        <div className="flex items-center gap-1.5">
                            {isWorking ? (
                                <button
                                    type="button"
                                    onClick={onStop}
                                    title="Stop agent run (Ctrl+D)"
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-900/40 active:scale-95 transition cursor-pointer"
                                >
                                    <div className="w-3.5 h-3.5">{Icon.stop}</div>
                                    <span>Stop</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={!promptText.trim() || isSending}
                                    onClick={onSend}
                                    title="Send prompt (Enter)"
                                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition active:scale-95 shadow-md shadow-blue-900/40 cursor-pointer"
                                >
                                    <div className="w-4 h-4">{Icon.send}</div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
