import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Icon } from '../../constants/icons';
import { FileIcon, getFileInfo } from '../../constants/fileIcons';
import MarkdownView from '../MarkdownView';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';

/**
 * Maps common file extensions to Monaco supported language identifiers.
 */
function getMonacoLanguage(ext = '', filename = '') {
    const cleanExt = (ext || '').toLowerCase().replace(/^\./, '');
    const lowerName = (filename || '').toLowerCase();

    if (lowerName === 'dockerfile') return 'dockerfile';
    if (lowerName === 'makefile') return 'makefile';

    const MAP = {
        js: 'javascript',
        mjs: 'javascript',
        cjs: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        mts: 'typescript',
        cts: 'typescript',
        tsx: 'typescript',
        py: 'python',
        pyw: 'python',
        ipynb: 'json',
        json: 'json',
        jsonc: 'json',
        json5: 'json',
        html: 'html',
        htm: 'html',
        css: 'css',
        scss: 'scss',
        sass: 'scss',
        less: 'less',
        md: 'markdown',
        markdown: 'markdown',
        sh: 'shell',
        bash: 'shell',
        zsh: 'shell',
        ps1: 'powershell',
        bat: 'bat',
        cmd: 'bat',
        yaml: 'yaml',
        yml: 'yaml',
        toml: 'ini',
        ini: 'ini',
        cfg: 'ini',
        conf: 'ini',
        env: 'shell',
        sql: 'sql',
        graphql: 'graphql',
        gql: 'graphql',
        rs: 'rust',
        go: 'go',
        c: 'c',
        h: 'c',
        cpp: 'cpp',
        hpp: 'cpp',
        cs: 'csharp',
        java: 'java',
        kt: 'kotlin',
        php: 'php',
        rb: 'ruby',
        xml: 'xml',
        svg: 'xml'
    };

    return MAP[cleanExt] || 'plaintext';
}

/**
 * FileViewerModal — Interactive full-file inspector with Monaco Editor,
 * language-based syntax highlighting, line-range highlighting, auto-centering,
 * and formatted Markdown Plan Preview.
 */
export default function FileViewerModal({ targetFile, onClose }) {
    const [fileData, setFileData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('preview'); // 'preview' | 'code'
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

    // Default to 'preview' for Markdown documents & media, 'code' for code files
    useEffect(() => {
        if (hasHighlight) {
            setViewMode('code');
        } else if (isMedia || isMarkdown) {
            setViewMode('preview');
        } else {
            setViewMode('code');
        }
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

        return () => {
            isMounted = false;
        };
    }, [filePath]);

    // Handle Monaco Editor Mounting
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        applyHighlightDecorations(editor, monaco);
    };

    // Apply Highlight Line Decorations & Auto-Center
    const applyHighlightDecorations = (editor, monaco) => {
        if (!editor || !monaco) return;

        if (hasHighlight && startLine > 0) {
            const targetEnd = endLine && endLine >= startLine ? endLine : startLine;
            const newDecorations = [
                {
                    range: new monaco.Range(startLine, 1, targetEnd, 1),
                    options: {
                        isWholeLine: true,
                        className: 'monaco-highlight-line',
                        glyphMarginClassName: 'monaco-highlight-glyph',
                        linesDecorationsClassName: 'monaco-highlight-glyph'
                    }
                }
            ];

            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);

            // Center highlighted range smoothly
            setTimeout(() => {
                editor.revealLineInCenter(startLine, 0); // 0 = Smooth scroll
            }, 50);
        } else {
            decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
        }
    };

    // Re-apply decorations when targetFile range or viewMode changes
    useEffect(() => {
        if (editorRef.current && monacoRef.current && viewMode === 'code') {
            applyHighlightDecorations(editorRef.current, monacoRef.current);
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
                className="w-full max-w-5xl h-[88vh] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden select-text"
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
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white border border-white/20">
                                    {startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}–${endLine}`}
                                </span>
                            )}

                            {fileData && (
                                <span className="text-[11px] font-mono text-zinc-500">
                                    ({isMedia
                                        ? `${(fileData.size_bytes / 1024).toFixed(1)} KB · ${ext.toUpperCase()}`
                                        : `${fileData.total_lines} lines · ${(fileData.size_bytes / 1024).toFixed(1)} KB`})
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

                {/* ─── Modal Viewport (Rendered Markdown Preview OR Monaco Editor) ─── */}
                <div className="flex-1 overflow-hidden bg-zinc-950 flex flex-col relative w-full h-full min-h-[450px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-zinc-500 space-y-2 flex-1">
                            <div className="w-6 h-6 animate-spin text-blue-400">{Icon.activity}</div>
                            <span className="text-xs font-mono">Loading file contents...</span>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-center space-y-2 text-rose-300 flex-1 flex flex-col items-center justify-center">
                            <div className="w-8 h-8 text-rose-400">{Icon.alertCircle}</div>
                            <p className="text-sm font-semibold">{error}</p>
                            <p className="text-xs text-zinc-500 font-mono break-all">{filePath}</p>
                        </div>
                    ) : isMedia ? (
                        /* Direct Media Viewer for Images, Videos & Audio */
                        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-zinc-950/90 relative">
                            {isImage && (
                                <div className="max-w-full max-h-full flex items-center justify-center p-2">
                                    <img
                                        src={fileData?.raw_url || `/api/v1/files/raw?path=${encodeURIComponent(filePath)}`}
                                        alt={fileData?.filename || 'Image Artifact'}
                                        className="max-w-full max-h-[75vh] object-contain rounded-lg border border-zinc-800 shadow-2xl bg-zinc-900/50"
                                        loading="lazy"
                                    />
                                </div>
                            )}
                            {isVideo && (
                                <div className="max-w-4xl w-full flex flex-col items-center justify-center p-2">
                                    <video
                                        controls
                                        autoPlay={false}
                                        src={fileData?.raw_url || `/api/v1/files/raw?path=${encodeURIComponent(filePath)}`}
                                        className="max-w-full max-h-[75vh] rounded-xl border border-zinc-800 shadow-2xl bg-black"
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            )}
                            {isAudio && (
                                <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col items-center gap-4 shadow-xl">
                                    <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                            <path d="M9 18V5l12-2v13"/>
                                            <circle cx="6" cy="18" r="3"/>
                                            <circle cx="18" cy="16" r="3"/>
                                        </svg>
                                    </div>
                                    <div className="text-sm font-mono text-zinc-300">{fileData?.filename || 'Audio Track'}</div>
                                    <audio
                                        controls
                                        src={fileData?.raw_url || `/api/v1/files/raw?path=${encodeURIComponent(filePath)}`}
                                        className="w-72"
                                    />
                                </div>
                            )}
                        </div>
                    ) : viewMode === 'preview' && isMarkdown ? (
                        /* Beautiful Rendered Markdown Preview for Plans & Specs */
                        <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-3xl mx-auto w-full">
                            <MarkdownView content={fileData?.content} />
                        </div>
                    ) : (
                        /* Monaco Editor View with Language-Based Syntax Highlighting & Line Decorators */
                        <div className="flex-1 w-full h-full relative overflow-hidden" style={{ minHeight: '450px' }}>
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
                                    minimap: { enabled: (fileData?.total_lines || 0) > 60 },
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    wordWrap: 'off',
                                    renderLineHighlight: 'all',
                                    padding: { top: 12, bottom: 12 },
                                    smoothScrolling: true,
                                    cursorBlinking: 'solid'
                                }}
                            />
                        </div>
                    )}
                </div>


                {/* ─── Footer Status ─── */}
                <div className="px-4 py-2 bg-zinc-950/90 border-t border-zinc-850 text-[11px] font-mono text-zinc-400 flex items-center justify-between select-none">
                    {hasHighlight ? (
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-white" />
                            Highlighted: <strong className="text-white">Lines {startLine}–{endLine}</strong> ({endLine - startLine + 1} lines)
                        </span>
                    ) : isMedia ? (
                        <span className="flex items-center gap-1.5 text-zinc-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Format: <strong className="text-zinc-200 uppercase">{fileData?.media_type || 'Media'} ({ext.toUpperCase()})</strong>
                        </span>
                    ) : isMarkdown ? (
                        <span className="flex items-center gap-1.5 text-zinc-400">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            Mode: <strong className="text-zinc-200">{viewMode === 'preview' ? 'Formatted Plan View' : 'Monaco Source View'}</strong>
                        </span>
                    ) : (
                        <span>Language: <strong className="text-zinc-200 uppercase">{getMonacoLanguage(fileData?.extension, fileData?.filename || filePath)}</strong> · {fileData?.total_lines || 0} lines</span>
                    )}


                    {hasHighlight && viewMode === 'code' && (
                        <button
                            type="button"
                            onClick={() => {
                                if (editorRef.current && startLine) {
                                    editorRef.current.revealLineInCenter(startLine, 0);
                                }
                            }}
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
