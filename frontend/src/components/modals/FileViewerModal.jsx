import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Icon } from '../../constants/icons';
import { FileIcon, getFileInfo } from '../../constants/fileIcons';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';
import { getMonacoLanguage, MediaPreviewViewport, MarkdownPreviewViewport } from './FileViewerHelpers';

export default function FileViewerModal({ targetFile, onClose }) {
    const [fileData, setFileData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('preview');
    const [copiedContent, setCopiedContent] = useState(false);
    const [copiedPath, setCopiedPath] = useState(false);
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const decorationsRef = useRef([]);

    const filePath = targetFile?.cleanPath || targetFile?.path || '';
    const startLine = targetFile?.startLine || null;
    const endLine = targetFile?.endLine || startLine;
    const hasHighlight = startLine !== null && startLine > 0;
    const ext = (filePath.split('.').pop() || '').toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext) || fileData?.media_type === 'image';
    const isVideo = ['mp4', 'webm', 'mov', 'm4v', 'ogg'].includes(ext) || fileData?.media_type === 'video';
    const isAudio = ['mp3', 'wav', 'm4a', 'flac'].includes(ext) || fileData?.media_type === 'audio';
    const isMedia = isImage || isVideo || isAudio || fileData?.is_media;

    const isMarkdown = Boolean(
        !isMedia && (
            filePath.endsWith('.md') ||
            filePath.endsWith('.markdown') ||
            filePath.toLowerCase().includes('plan') ||
            fileData?.extension === 'md'
        )
    );

    useEffect(() => {
        if (hasHighlight) setViewMode('code');
        else if (isMedia || isMarkdown) setViewMode('preview');
        else setViewMode('code');
    }, [filePath, hasHighlight, isMarkdown, isMedia]);

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

        return () => { isMounted = false; };
    }, [filePath]);

    const applyHighlightDecorations = (editor, monaco) => {
        if (!editor || !monaco) return;
        if (hasHighlight && startLine > 0) {
            const targetEnd = endLine && endLine >= startLine ? endLine : startLine;
            const newDecorations = [{
                range: new monaco.Range(startLine, 1, targetEnd, 1),
                options: {
                    isWholeLine: true,
                    className: 'monaco-highlight-line',
                    glyphMarginClassName: 'monaco-highlight-glyph',
                    linesDecorationsClassName: 'monaco-highlight-glyph'
                }
            }];
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
            setTimeout(() => { editor.revealLineInCenter(startLine, 0); }, 50);
        } else {
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        }
    };

    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        applyHighlightDecorations(editor, monaco);
    };

    useEffect(() => {
        if (editorRef.current && monacoRef.current && viewMode === 'code') {
            applyHighlightDecorations(editorRef.current, monacoRef.current);
        }
    }, [fileData, startLine, endLine, viewMode, hasHighlight]);

    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!targetFile && !filePath) return null;

    const fileInfo = getFileInfo(filePath);

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
            role="dialog"
            aria-modal="true"
            aria-label={fileData?.filename || targetFile?.filename || 'File Inspector'}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-1.5 sm:p-4 bg-black/80 select-none"
            onClick={onClose}
        >
            <div
                className="w-full max-w-5xl h-[92dvh] sm:h-[88dvh] bg-[#17191C] border border-[#30343A] rounded-lg shadow-2xl flex flex-col overflow-hidden select-text"
                onClick={e => e.stopPropagation()}
            >
                <div className="px-3 sm:px-4 py-2.5 bg-[#1D2024] border-b border-[#30343A] flex items-center justify-between gap-2 shrink-0 select-none">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileIcon path={filePath} className="w-4 h-4 shrink-0" />
                        <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs sm:text-sm font-semibold text-[#E8EAED] truncate">
                                {fileData?.filename || targetFile?.filename || 'File Preview'}
                            </span>
                            {fileInfo.label && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-[#101113] text-[#A0A6AF] border border-[#30343A]">
                                    {fileInfo.label}
                                </span>
                            )}
                            {hasHighlight && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#7C9FC5]/15 text-[#7C9FC5] border border-[#7C9FC5]/35 tabular-nums">
                                    {startLine === endLine ? `L${startLine}` : `L${startLine}–${endLine}`}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {isMarkdown && (
                            <div className="flex items-center rounded bg-[#101113] border border-[#30343A] p-0.5 text-xs mr-1">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('preview')}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                                        viewMode === 'preview' ? 'bg-[#1D2024] text-[#E8EAED] border border-[#30343A]' : 'text-[#A0A6AF] hover:text-[#E8EAED]'
                                    }`}
                                >
                                    Preview
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('code')}
                                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                                        viewMode === 'code' ? 'bg-[#1D2024] text-[#E8EAED] border border-[#30343A]' : 'text-[#A0A6AF] hover:text-[#E8EAED]'
                                    }`}
                                >
                                    Source
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleCopyPath}
                            title="Copy file path"
                            className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
                        >
                            <span className="text-[11px] font-mono flex items-center gap-1">
                                <div className="w-3.5 h-3.5 text-[#79B89A]">{copiedPath ? Icon.check : Icon.copy}</div>
                                <span className="hidden sm:inline">Path</span>
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleCopyCode}
                            disabled={!fileData?.content}
                            title="Copy file content"
                            className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer disabled:opacity-40"
                        >
                            <span className="text-[11px] font-mono flex items-center gap-1">
                                <div className="w-3.5 h-3.5">{copiedContent ? Icon.check : Icon.copy}</div>
                                <span className="hidden sm:inline">{copiedContent ? 'Copied' : 'Copy'}</span>
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close inspector"
                            title="Close (Esc)"
                            className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.x}</div>
                        </button>
                    </div>
                </div>

                <div className="px-3 sm:px-4 py-1 bg-[#101113] border-b border-[#262A30] text-[11px] font-mono text-[#747C87] truncate select-all">
                    {filePath}
                </div>

                <div className="flex-1 min-h-0 overflow-hidden bg-[#101113] flex flex-col relative w-full">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-[#A0A6AF] space-y-2 flex-1">
                            <span className="w-5 h-5 rounded-full border-2 border-[#7C9FC5] border-t-transparent animate-spin" />
                            <span className="text-xs font-mono">Loading file contents...</span>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center space-y-2 text-[#D77E83] flex-1 flex flex-col items-center justify-center">
                            <div className="w-6 h-6">{Icon.alertCircle}</div>
                            <p className="text-xs font-semibold">{error}</p>
                            <p className="text-[11px] text-[#747C87] font-mono break-all">{filePath}</p>
                        </div>
                    ) : isMedia ? (
                        <MediaPreviewViewport isImage={isImage} isVideo={isVideo} isAudio={isAudio} fileData={fileData} filePath={filePath} />
                    ) : viewMode === 'preview' && isMarkdown ? (
                        <MarkdownPreviewViewport content={fileData?.content} />
                    ) : (
                        <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
                            <Editor
                                height="100%"
                                width="100%"
                                theme="vs-dark"
                                language={getMonacoLanguage(fileData?.extension, fileData?.filename || filePath)}
                                value={fileData?.content || ''}
                                onMount={handleEditorDidMount}
                                options={{
                                    readOnly: true,
                                    domReadOnly: true,
                                    fontSize: 12,
                                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                                    lineNumbers: 'on',
                                    glyphMargin: hasHighlight,
                                    minimap: { enabled: (fileData?.total_lines || 0) > 80 },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    wordWrap: 'off',
                                    renderLineHighlight: 'all',
                                    padding: { top: 10, bottom: 10 }
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="px-3 sm:px-4 py-1.5 bg-[#1D2024] border-t border-[#30343A] text-[11px] font-mono text-[#A0A6AF] flex items-center justify-between gap-2 select-none">
                    <span className="truncate tabular-nums">
                        {hasHighlight
                            ? `Lines ${startLine}–${endLine} (${endLine - startLine + 1} lines)`
                            : `${getMonacoLanguage(fileData?.extension, fileData?.filename || filePath).toUpperCase()} · ${fileData?.total_lines || 0} lines`}
                    </span>
                    {hasHighlight && viewMode === 'code' && (
                        <button
                            type="button"
                            onClick={() => editorRef.current && startLine && editorRef.current.revealLineInCenter(startLine, 0)}
                            className="text-xs text-[#7C9FC5] hover:underline cursor-pointer shrink-0"
                        >
                            Center highlight
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
