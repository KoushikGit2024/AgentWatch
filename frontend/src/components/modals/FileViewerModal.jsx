import React, { useState, useEffect, useRef } from 'react';
import { Icon } from '../../constants/icons';
import { FileIcon, getFileInfo } from '../../constants/fileIcons';
import MarkdownView from '../MarkdownView';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';

/**
 * FileViewerModal — Interactive full-file inspector with line-range highlighting,
 * automatic centering, line number gutters, quick copy, and formatted Markdown Preview
 * for system-generated plan files (*.md, plan*, instructions).
 */
export default function FileViewerModal({ targetFile, onClose }) {
    const [fileData, setFileData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'code'
    const [copiedContent, setCopiedContent] = useState(false);
    const [copiedPath, setCopiedPath] = useState(false);
    const targetLineRef = useRef(null);

    const filePath = targetFile?.cleanPath || targetFile?.path || '';
    const startLine = targetFile?.startLine || null;
    const endLine = targetFile?.endLine || startLine;
    const hasHighlight = startLine !== null && startLine > 0;

    const isMarkdown = Boolean(
        filePath.endsWith('.md') ||
        filePath.endsWith('.markdown') ||
        filePath.toLowerCase().includes('plan') ||
        fileData?.extension === 'md'
    );

    // Default to 'preview' for Markdown documents, 'code' for code files
    useEffect(() => {
        if (hasHighlight) {
            setViewMode('code');
        } else if (isMarkdown) {
            setViewMode('preview');
        } else {
            setViewMode('code');
        }
    }, [filePath, hasHighlight, isMarkdown]);

    useEffect(() => {
        if (!filePath) {
            setFileData(null);
            setError(null);
            return;
        }

        let isMounted = true;
        setIsLoading(true);
        setError(null);

        api.getFileContent(filePath)
            .then(data => {
                if (isMounted) {
                    setFileData(data);
                    setIsLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    setError(err.message || 'Could not load file content');
                    setIsLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [filePath]);

    // Scroll highlighted line into view upon data load in code mode
    useEffect(() => {
        if (fileData && viewMode === 'code' && hasHighlight) {
            const timer = setTimeout(() => {
                targetLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [fileData, startLine, endLine, viewMode, hasHighlight]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!targetFile && !filePath) return null;

    const fileInfo = getFileInfo(filePath);
    const lines = fileData?.lines || [];

    const handleCopyPath = async () => {
        try {
            await navigator.clipboard.writeText(filePath);
            setCopiedPath(true);
            toast.success('File path copied to clipboard');
            setTimeout(() => setCopiedPath(false), 1800);
        } catch {
            toast.info(filePath);
        }
    };

    const handleCopyCode = async () => {
        if (!fileData?.content) return;
        try {
            await navigator.clipboard.writeText(fileData.content);
            setCopiedContent(true);
            toast.success('File content copied to clipboard');
            setTimeout(() => setCopiedContent(false), 1800);
        } catch {
            toast.error('Could not copy content to clipboard');
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="w-full max-w-4xl max-h-[92vh] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden select-text"
                onClick={e => e.stopPropagation()}
            >
                {/* ─── Modal Header Bar ─── */}
                <div className="px-4 py-3 bg-zinc-950/80 border-b border-zinc-850 flex items-center justify-between shrink-0 select-none">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <FileIcon path={filePath} className="w-4 h-4 shrink-0" />
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-zinc-100 truncate">
                                {fileData?.filename || targetFile?.filename || 'File Preview'}
                            </span>

                            {fileInfo.label && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {fileInfo.label}
                                </span>
                            )}

                            {hasHighlight && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                    {startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}–${endLine}`}
                                </span>
                            )}

                            {fileData && (
                                <span className="text-[11px] font-mono text-zinc-500">
                                    ({fileData.total_lines} lines · {(fileData.size_bytes / 1024).toFixed(1)} KB)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action controls & Markdown preview toggle */}
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {/* Preview / Raw Code Toggle for Markdown files */}
                        {isMarkdown && (
                            <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-700/80 p-0.5 text-xs mr-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('preview')}
                                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                        viewMode === 'preview'
                                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                            : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    Plan View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('code')}
                                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                                        viewMode === 'code'
                                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                            : 'text-zinc-400 hover:text-zinc-200'
                                    }`}
                                >
                                    Raw Source
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleCopyPath}
                            title="Copy file path"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                            {copiedPath ? (
                                <span className="text-emerald-400 text-xs font-mono font-medium flex items-center gap-1">
                                    <div className="w-3.5 h-3.5">{Icon.check}</div> Path
                                </span>
                            ) : (
                                <span className="text-zinc-400 text-xs font-mono flex items-center gap-1">
                                    <div className="w-3.5 h-3.5">{Icon.copy}</div> Path
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleCopyCode}
                            disabled={!fileData?.content}
                            title="Copy content"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer disabled:opacity-40"
                        >
                            {copiedContent ? (
                                <span className="text-emerald-400 text-xs font-mono font-medium flex items-center gap-1">
                                    <div className="w-3.5 h-3.5">{Icon.check}</div> Copied
                                </span>
                            ) : (
                                <span className="text-zinc-400 text-xs font-mono flex items-center gap-1">
                                    <div className="w-3.5 h-3.5">{Icon.copy}</div> Text
                                </span>
                            )}
                        </button>

                        <div className="h-4 w-px bg-zinc-800 mx-1" />

                        <button
                            type="button"
                            onClick={onClose}
                            title="Close (Esc)"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.x}</div>
                        </button>
                    </div>
                </div>

                {/* Path sub-bar */}
                <div className="px-4 py-1.5 bg-zinc-950/40 border-b border-zinc-850/60 text-[11px] font-mono text-zinc-500 truncate select-all">
                    {filePath}
                </div>

                {/* ─── Modal Viewport (Rendered Markdown Preview OR Numbered Code Lines) ─── */}
                <div className="flex-1 overflow-auto bg-zinc-950 p-3 sm:p-5 text-xs min-h-[350px] max-h-[75vh]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 space-y-2">
                            <div className="w-6 h-6 animate-spin text-blue-400">{Icon.activity}</div>
                            <span className="text-xs">Reading file contents...</span>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center space-y-2 text-rose-300">
                            <div className="w-8 h-8 mx-auto text-rose-400">{Icon.alertCircle}</div>
                            <p className="text-sm font-semibold">{error}</p>
                            <p className="text-xs text-zinc-500 font-mono break-all">{filePath}</p>
                        </div>
                    ) : viewMode === 'preview' && isMarkdown ? (
                        /* Beautiful Rendered Markdown Preview for Plans & Specs */
                        <div className="max-w-3xl mx-auto py-2">
                            <MarkdownView content={fileData?.content} />
                        </div>
                    ) : (
                        /* Monospace Code Editor View with Line Highlighting & Numbered Gutters */
                        <div className="min-w-full inline-block font-mono leading-relaxed">
                            {lines.map((lineText, idx) => {
                                const lineNum = idx + 1;
                                const isHighlighted = hasHighlight && lineNum >= startLine && lineNum <= endLine;
                                const isStartOfHighlight = hasHighlight && lineNum === startLine;

                                return (
                                    <div
                                        key={lineNum}
                                        ref={isStartOfHighlight ? targetLineRef : null}
                                        className={`flex items-start transition-colors rounded ${
                                            isHighlighted
                                                ? 'bg-amber-500/15 border-l-2 border-amber-400 text-amber-100 font-semibold'
                                                : 'hover:bg-zinc-900/60 text-zinc-300'
                                        }`}
                                    >
                                        {/* Line Number Gutter */}
                                        <span className={`w-10 sm:w-12 text-right pr-3 select-none text-[11px] shrink-0 ${
                                            isHighlighted ? 'text-amber-400 font-bold' : 'text-zinc-600'
                                        }`}>
                                            {lineNum}
                                        </span>

                                        {/* Code Line Text */}
                                        <span className="whitespace-pre flex-1 pl-1 pr-4 select-text">
                                            {lineText || ' '}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ─── Footer Status ─── */}
                <div className="px-4 py-2 bg-zinc-950/90 border-t border-zinc-850 text-[11px] font-mono text-zinc-400 flex items-center justify-between select-none">
                    {hasHighlight ? (
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Highlighted: <strong className="text-amber-300">Lines {startLine}–{endLine}</strong> ({endLine - startLine + 1} lines)
                        </span>
                    ) : isMarkdown ? (
                        <span className="flex items-center gap-1.5 text-zinc-400">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            Mode: <strong className="text-zinc-200">{viewMode === 'preview' ? 'Formatted Plan View' : 'Raw Markdown Source'}</strong>
                        </span>
                    ) : (
                        <span>Total: <strong className="text-zinc-200">{lines.length} lines</strong></span>
                    )}

                    {hasHighlight && viewMode === 'code' && (
                        <button
                            type="button"
                            onClick={() => targetLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                            className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
                        >
                            Jump to highlight
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
