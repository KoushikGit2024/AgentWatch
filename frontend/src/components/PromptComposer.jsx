import React from 'react';

export function PromptComposer({ promptText, onChangePrompt, onSend, isSending, onSelectQuickAction }) {
    const quickActions = ['Continue', 'Explain Code', 'Fix Bugs', 'Create Docs'];

    return (
        <div className="bg-zinc-900 border-t border-zinc-800 shrink-0 z-20 pb-safe select-none">
            {/* Quick Action Chips */}
            <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto border-b border-zinc-800/60 no-scrollbar">
                {quickActions.map(action => (
                    <button
                        key={action}
                        type="button"
                        onClick={() => onSelectQuickAction(action)}
                        className="text-[11px] font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-700/60 transition shrink-0"
                    >
                        {action}
                    </button>
                ))}
            </div>

            {/* Message Textarea & Send Button */}
            <div className="p-3 flex items-center gap-2">
                <div className="flex-1 flex items-center bg-zinc-950 border border-zinc-800 focus-within:border-zinc-700 rounded-lg px-3 py-1.5 transition">
                    <textarea
                        value={promptText}
                        onChange={e => onChangePrompt(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                onSend();
                            }
                        }}
                        placeholder="Message agent..."
                        rows={1}
                        className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 resize-none outline-none max-h-32"
                    />
                </div>
                <button
                    type="button"
                    disabled={!promptText.trim() || isSending}
                    onClick={onSend}
                    className="p-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition shrink-0"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
