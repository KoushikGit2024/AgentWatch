import React, { useState } from 'react';
import { Icon } from '../../constants/icons';

export default function DiffViewer({ diff, filename, className = '' }) {
    const [copied, setCopied] = useState(false);

    if (!diff) return null;

    const diffText = diff.diff_text || '';
    const hasDiffText = Boolean(diffText && diffText.trim());

    const handleCopy = (e) => {
        e.stopPropagation();
        const textToCopy = diffText || diff.replacement_content || '';
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    // If we have unified diff format (with @@ or ---/+++)
    if (hasDiffText) {
        const lines = diffText.split('\n');

        return (
            <div className={`space-y-1 w-full min-w-0 max-w-full font-mono text-[11px] select-text ${className}`}>
                <div className="flex items-center justify-between px-2.5 py-1 bg-zinc-950 border border-zinc-800 rounded-t-lg text-zinc-400 text-[10px]">
                    <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-zinc-300 truncate">
                            {filename || diff.file || 'Patch Diff'}
                        </span>
                        {diff.added_count !== undefined && diff.removed_count !== undefined && (
                            <span className="text-[9px] font-sans px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                {diff.removed_count > 0 && <span className="text-rose-400">-{diff.removed_count} </span>}
                                {diff.added_count > 0 && <span className="text-emerald-400">+{diff.added_count}</span>}
                                {diff.added_count === 0 && diff.removed_count === 0 && <span>0 lines</span>}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition flex items-center gap-1 text-[10px]"
                        title="Copy unified diff"
                    >
                        {copied ? (
                            <>
                                <span className="text-emerald-400 w-3 h-3">{Icon.check}</span>
                                <span className="text-emerald-400">Copied</span>
                            </>
                        ) : (
                            <>
                                <span className="w-3 h-3 text-zinc-400">{Icon.copy}</span>
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                </div>

                <div className="p-2 bg-zinc-950 border border-t-0 border-zinc-850 rounded-b-lg max-h-64 overflow-y-auto overflow-x-auto leading-relaxed select-text w-full max-w-full">
                    {lines.map((line, idx) => {
                        const isAdd = line.startsWith('+') && !line.startsWith('+++');
                        const isDel = line.startsWith('-') && !line.startsWith('---');
                        const isHunk = line.startsWith('@@');
                        const isHeader = line.startsWith('---') || line.startsWith('+++') || line.startsWith('diff ');

                        let lineStyle = 'text-zinc-400';
                        let bgStyle = '';

                        if (isAdd) {
                            lineStyle = 'text-emerald-300';
                            bgStyle = 'bg-emerald-950/30 border-l-2 border-emerald-500/70 pl-1.5';
                        } else if (isDel) {
                            lineStyle = 'text-rose-300';
                            bgStyle = 'bg-rose-950/30 border-l-2 border-rose-500/70 pl-1.5';
                        } else if (isHunk) {
                            lineStyle = 'text-cyan-400/90 font-semibold text-[10px] my-1 opacity-90';
                            bgStyle = 'bg-cyan-950/20 px-1 py-0.5 rounded';
                        } else if (isHeader) {
                            lineStyle = 'text-zinc-500 text-[10px]';
                        }

                        return (
                            <div
                                key={idx}
                                className={`whitespace-pre [word-break:break-all] py-0.5 rounded-sm ${lineStyle} ${bgStyle}`}
                            >
                                {line || ' '}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Fallback: If only target_content and replacement_content exist
    return (
        <div className={`space-y-1.5 font-mono text-[11px] select-text w-full min-w-0 max-w-full ${className}`}>
            {diff.target_content && (
                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-rose-300 max-h-48 overflow-y-auto overflow-x-auto whitespace-pre-wrap [word-break:break-word] w-full max-w-full">
                    <div className="text-[9px] uppercase tracking-wider text-rose-400/80 mb-1 font-sans select-none flex items-center justify-between">
                        <span>Original</span>
                        {diff.start_line && <span>Line {diff.start_line}</span>}
                    </div>
                    {diff.target_content}
                </div>
            )}
            {diff.replacement_content && (
                <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-emerald-300 max-h-48 overflow-y-auto overflow-x-auto whitespace-pre-wrap [word-break:break-word] w-full max-w-full">
                    <div className="text-[9px] uppercase tracking-wider text-emerald-400/80 mb-1 font-sans select-none flex items-center justify-between">
                        <span>Replacement</span>
                        {diff.added_count ? <span>+{diff.added_count} lines</span> : null}
                    </div>
                    {diff.replacement_content}
                </div>
            )}
        </div>
    );
}
