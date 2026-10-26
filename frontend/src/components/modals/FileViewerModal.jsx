import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Icon } from '../../constants/icons';
import { FileIcon, getFileInfo } from '../../constants/fileIcons';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';
import { getMonacoLanguage, MediaPreviewViewport, MarkdownPreviewViewport } from './FileViewerHelpers';
import { BinaryFileViewport } from './BinaryFileViewport';

export default function FileViewerModal({ targetFile, onClose, onToggleTreeDrawer }) {
    const [tabs, setTabs] = useState([]);
    const [activeTabPath, setActiveTabPath] = useState(null);
    const [tabDataMap, setTabDataMap] = useState({}); // { [path]: { fileData, isLoading, error, viewMode } }
    const [copiedContent, setCopiedContent] = useState(false);
    const [copiedPath, setCopiedPath] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const decorationsRef = useRef([]);

    // Broadcast minimized state and tabs to window so PromptComposer can display an inline badge
    useEffect(() => {
        const detail = {
            isMinimized,
            hasTabs: tabs.length > 0,
            tabsCount: tabs.length,
            activeTab: tabs.find(t => t.path === activeTabPath) || null
        };
        window.dispatchEvent(new CustomEvent('agentwatch:file-viewer-status', { detail }));
    }, [isMinimized, tabs, activeTabPath]);

    // Allow external restore / toggle from composer badge
    useEffect(() => {
        const onRestore = () => setIsMinimized(false);
        const onCloseViewer = () => handleCloseAll();
        window.addEventListener('agentwatch:file-viewer-restore', onRestore);
        window.addEventListener('agentwatch:file-viewer-close', onCloseViewer);
        return () => {
            window.removeEventListener('agentwatch:file-viewer-restore', onRestore);
            window.removeEventListener('agentwatch:file-viewer-close', onCloseViewer);
        };
    }, []);

    // Open or switch tab when targetFile prop changes
    useEffect(() => {
        if (!targetFile) return;
        const rawPath = targetFile.cleanPath || targetFile.path || '';
        if (!rawPath) return;

        const pathKey = rawPath.replace(/\\/g, '/');
        const filename = targetFile.filename || pathKey.split('/').pop() || 'File';
        const startLine = targetFile.startLine || null;
        const endLine = targetFile.endLine || startLine;
        const hasHighlight = startLine !== null && startLine > 0;

        setTabs(prev => {
            const existingIdx = prev.findIndex(t => t.path === pathKey);
            if (existingIdx !== -1) {
                const updated = [...prev];
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    startLine,
                    endLine,
                    hasHighlight
                };
                return updated;
            }
            return [...prev, {
                id: pathKey,
                path: pathKey,
                filename,
                startLine,
                endLine,
                hasHighlight
            }];
        });

        setActiveTabPath(pathKey);
        setIsMinimized(false); // Auto restore if minimized when a new file or tab is opened
    }, [targetFile]);

    // Active tab and its data
    const activeTab = tabs.find(t => t.path === activeTabPath) || null;
    const activePath = activeTab?.path || '';
    const activeDataState = tabDataMap[activePath] || { isLoading: false, fileData: null, error: null, viewMode: 'code' };

    // Fetch active tab file content if not already loaded or failed
    useEffect(() => {
        if (!activePath) return;
        const currentEntry = tabDataMap[activePath];
        if (currentEntry?.fileData || currentEntry?.isLoading || currentEntry?.error) return;

        setTabDataMap(prev => ({
            ...prev,
            [activePath]: { ...prev[activePath], isLoading: true, error: null }
        }));

        api.getFileContent(activePath)
            .then(data => {
                const ext = (activePath.split('.').pop() || '').toLowerCase();
                const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext) || data?.media_type === 'image';
                const isVid = ['mp4', 'webm', 'mov', 'm4v', 'ogg'].includes(ext) || data?.media_type === 'video';
                const isAud = ['mp3', 'wav', 'm4a', 'flac'].includes(ext) || data?.media_type === 'audio';
                const isMd = !isImg && !isVid && !isAud && (activePath.endsWith('.md') || activePath.endsWith('.markdown') || data?.extension === 'md');

                let defaultMode = 'code';
                if (activeTab?.hasHighlight) defaultMode = 'code';
                else if (isImg || isVid || isAud || isMd) defaultMode = 'preview';

                setTabDataMap(prev => ({
                    ...prev,
                    [activePath]: {
                        isLoading: false,
                        fileData: data,
                        error: null,
                        viewMode: defaultMode
                    }
                }));
            })
            .catch(err => {
                setTabDataMap(prev => ({
                    ...prev,
                    [activePath]: {
                        isLoading: false,
                        fileData: null,
                        error: err.message || 'Could not load file content',
                        viewMode: 'code'
                    }
                }));
            });
    }, [activePath, activeTab?.hasHighlight, tabDataMap[activePath]?.fileData, tabDataMap[activePath]?.isLoading, tabDataMap[activePath]?.error]);

    // Close all tabs and dismiss modal completely
    const handleCloseAll = useCallback(() => {
        setTabs([]);
        setActiveTabPath(null);
        setIsMinimized(false);
        setIsMaximized(false);
        if (onClose) onClose();
    }, [onClose]);

    // Handle close individual tab
    const handleCloseTab = useCallback((e, path) => {
        if (e) e.stopPropagation();
        setTabs(prev => {
            const next = prev.filter(t => t.path !== path);
            if (activeTabPath === path) {
                const closedIdx = prev.findIndex(t => t.path === path);
                const nextActive = next[closedIdx] || next[closedIdx - 1] || next[0] || null;
                setActiveTabPath(nextActive ? nextActive.path : null);
                if (!nextActive) {
                    handleCloseAll();
                }
            }
            return next;
        });
    }, [activeTabPath, handleCloseAll]);

    // Highlights in Monaco
    const applyHighlightDecorations = (editor, monaco) => {
        if (!editor || !monaco) return;
        const startLine = activeTab?.startLine;
        const endLine = activeTab?.endLine;
        if (activeTab?.hasHighlight && startLine > 0) {
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
        if (editorRef.current && monacoRef.current && activeDataState.viewMode === 'code') {
            applyHighlightDecorations(editorRef.current, monacoRef.current);
        }
    }, [activeDataState.fileData, activeTab, activeDataState.viewMode]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (isMaximized) {
                    setIsMaximized(false);
                } else {
                    handleCloseAll();
                }
            } else if (e.key === 'w' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                if (activeTabPath) handleCloseTab(null, activeTabPath);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleCloseAll, activeTabPath, handleCloseTab, isMaximized]);

    // If no tabs are open and no targetFile, render nothing
    if (tabs.length === 0) return null;

    const fileData = activeDataState.fileData;
    const viewMode = activeDataState.viewMode;
    const ext = (activePath.split('.').pop() || '').toLowerCase();
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext) || fileData?.media_type === 'image';
    const isVideo = ['mp4', 'webm', 'mov', 'm4v', 'ogg'].includes(ext) || fileData?.media_type === 'video';
    const isAudio = ['mp3', 'wav', 'm4a', 'flac'].includes(ext) || fileData?.media_type === 'audio';
    const isSvg = ext === 'svg';
    const isMedia = isImage || isVideo || isAudio || fileData?.is_media;
    const isMarkdown = Boolean(!isMedia && (activePath.endsWith('.md') || activePath.endsWith('.markdown') || fileData?.extension === 'md'));
    const canTogglePreview = isMarkdown || isSvg;
    const fileInfo = getFileInfo(activePath);

    const handleCopyPath = async () => {
        try {
            await navigator.clipboard.writeText(activePath);
            setCopiedPath(true);
            toast.success('File path copied to clipboard');
            setTimeout(() => setCopiedPath(false), 1800);
        } catch {
            toast.info(activePath);
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
            toast.error('Could not copy content');
        }
    };

    // 1. Minimized state: Handled directly and cleanly inside the PromptComposer input toolbar
    if (isMinimized) {
        return null;
    }

    // 2. Normal Floating Window or Maximized Window
    const containerClasses = isMaximized
        ? 'fixed inset-1.5 sm:inset-4 z-[90] flex flex-col'
        : 'fixed inset-x-2 bottom-2 top-14 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-[780px] lg:sm:w-[940px] sm:h-[620px] sm:max-h-[92vh] z-[90] flex flex-col';

    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-label="Multi-File IDE Viewer"
            className={`${containerClasses} bg-[#17191C] border border-[#30343A] rounded-xl shadow-2xl overflow-hidden select-text animate-in fade-in slide-in-from-bottom-2 duration-150`}
        >
            {/* IDE Horizontal Tab Bar */}
            <div className="flex items-center justify-between border-b border-[#30343A] bg-[#121316] px-1 select-none overflow-hidden shrink-0">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
                    {onToggleTreeDrawer && (
                        <button
                            type="button"
                            onClick={onToggleTreeDrawer}
                            title="Toggle Project File Tree"
                            className="aw-focus-ring flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] border border-transparent hover:border-[#30343A] transition cursor-pointer shrink-0 mr-1"
                        >
                            <div className="w-3.5 h-3.5 text-amber-400">{Icon.folder}</div>
                            <span className="hidden sm:inline">Files</span>
                        </button>
                    )}

                    {tabs.map(tab => {
                        const isActive = tab.path === activeTabPath;
                        return (
                            <div
                                key={tab.path}
                                onClick={() => setActiveTabPath(tab.path)}
                                title={tab.path}
                                className={`aw-focus-ring group flex items-center gap-2 px-3 py-1.5 rounded-t-md text-xs font-mono font-medium transition cursor-pointer shrink-0 max-w-[210px] border-t border-l border-r ${
                                    isActive
                                        ? 'bg-[#17191C] text-[#E8EAED] border-[#30343A] shadow-xs'
                                        : 'bg-[#15171A] text-[#747C87] hover:text-[#A0A6AF] hover:bg-[#1A1C20] border-transparent'
                                }`}
                            >
                                <FileIcon path={tab.path} className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{tab.filename}</span>
                                {tab.hasHighlight && (
                                    <span className="text-[9px] px-1 rounded bg-[#7C9FC5]/20 text-[#7C9FC5] shrink-0 tabular-nums">
                                        {tab.startLine === tab.endLine ? `L${tab.startLine}` : `L${tab.startLine}-${tab.endLine}`}
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => handleCloseTab(e, tab.path)}
                                    title="Close Tab (Ctrl+W)"
                                    className="w-4 h-4 rounded hover:bg-[#30343A] flex items-center justify-center text-[#747C87] hover:text-[#E8EAED] transition shrink-0 ml-0.5 cursor-pointer"
                                >
                                    <div className="w-3 h-3">{Icon.x}</div>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Window Controls */}
                <div className="flex items-center gap-1 shrink-0 px-2">
                    {canTogglePreview && (
                        <div className="flex items-center rounded bg-[#101113] border border-[#30343A] p-0.5 text-xs mr-1">
                            <button
                                type="button"
                                onClick={() => setTabDataMap(prev => ({
                                    ...prev,
                                    [activePath]: { ...prev[activePath], viewMode: 'preview' }
                                }))}
                                className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                                    viewMode === 'preview' ? 'bg-[#1D2024] text-[#E8EAED] border border-[#30343A]' : 'text-[#A0A6AF] hover:text-[#E8EAED]'
                                }`}
                            >
                                Preview
                            </button>
                            <button
                                type="button"
                                onClick={() => setTabDataMap(prev => ({
                                    ...prev,
                                    [activePath]: { ...prev[activePath], viewMode: 'code' }
                                }))}
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
                        className="p-1 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
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
                        className="p-1 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer disabled:opacity-40"
                    >
                        <span className="text-[11px] font-mono flex items-center gap-1">
                            <div className="w-3.5 h-3.5">{copiedContent ? Icon.check : Icon.copy}</div>
                            <span className="hidden sm:inline">{copiedContent ? 'Copied' : 'Copy'}</span>
                        </span>
                    </button>

                    {/* Window Controls: Minimize */}
                    <button
                        type="button"
                        onClick={() => setIsMinimized(true)}
                        title="Minimize to Floating Dock"
                        className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer ml-1"
                    >
                        <div className="w-3.5 h-3.5">{Icon.minimize}</div>
                    </button>

                    {/* Window Controls: Maximize / Restore */}
                    <button
                        type="button"
                        onClick={() => setIsMaximized(prev => !prev)}
                        title={isMaximized ? "Restore down" : "Maximize window"}
                        className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#23272D] transition cursor-pointer"
                    >
                        <div className="w-3.5 h-3.5">{isMaximized ? Icon.restore : Icon.maximize}</div>
                    </button>

                    {/* Close All */}
                    <button
                        type="button"
                        onClick={handleCloseAll}
                        aria-label="Close inspector"
                        title="Close Inspector (Esc)"
                        className="p-1.5 rounded text-[#A0A6AF] hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer ml-0.5"
                    >
                        <div className="w-4 h-4">{Icon.x}</div>
                    </button>
                </div>
            </div>

            {/* Subheader: Active File Path */}
            <div className="px-3 sm:px-4 py-1 bg-[#15171A] border-b border-[#262A30] text-[11px] font-mono text-[#747C87] flex items-center justify-between select-all shrink-0">
                <span className="truncate">{activePath}</span>
                {fileInfo.label && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-[#101113] text-[#A0A6AF] border border-[#30343A] shrink-0 ml-2">
                        {fileInfo.label}
                    </span>
                )}
            </div>

            {/* Viewport Body */}
            <div className="flex-1 min-h-0 overflow-hidden bg-[#101113] flex flex-col relative w-full">
                {activeDataState.isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#A0A6AF] space-y-2 flex-1">
                        <span className="w-5 h-5 rounded-full border-2 border-[#7C9FC5] border-t-transparent animate-spin" />
                        <span className="text-xs font-mono">Loading file contents...</span>
                    </div>
                ) : activeDataState.error ? (
                    <div className="p-6 text-center flex-1 flex flex-col items-center justify-center max-w-md mx-auto select-text">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-sm">
                            <div className="w-6 h-6">{Icon.alertCircle}</div>
                        </div>
                        <h3 className="text-sm font-semibold text-[#E8EAED] tracking-tight mb-1">
                            {activeDataState.error.toLowerCase().includes('large') || activeDataState.error.toLowerCase().includes('size') || activeDataState.error.toLowerCase().includes('exceed')
                                ? 'File Too Large to Preview'
                                : 'Unable to Display File'}
                        </h3>
                        <p className="text-xs text-[#A0A6AF] leading-relaxed mb-3">
                            {activeDataState.error}
                        </p>
                        <div className="px-3 py-1.5 rounded-md bg-[#17191C] border border-[#262A30] font-mono text-[11px] text-[#747C87] break-all max-w-full mb-4">
                            {activePath}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setTabDataMap(prev => ({
                                        ...prev,
                                        [activePath]: null
                                    }));
                                }}
                                className="px-3 py-1.5 rounded-md bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] hover:border-[#7C9FC5]/40 text-xs font-medium text-[#E8EAED] transition cursor-pointer"
                            >
                                Retry Loading
                            </button>
                            <a
                                href={`/api/v1/files/raw?path=${encodeURIComponent(activePath)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="px-3 py-1.5 rounded-md bg-[#7C9FC5]/20 hover:bg-[#7C9FC5]/30 border border-[#7C9FC5]/40 text-xs font-medium text-[#7C9FC5] transition cursor-pointer flex items-center gap-1.5"
                            >
                                <div className="w-3.5 h-3.5">{Icon.externalLink}</div>
                                <span>Download Raw</span>
                            </a>
                        </div>
                    </div>
                ) : fileData?.is_binary ? (
                    <BinaryFileViewport fileData={fileData} activePath={activePath} />
                ) : (isMedia && (!isSvg || viewMode === 'preview')) ? (
                    <MediaPreviewViewport isImage={isImage} isVideo={isVideo} isAudio={isAudio} fileData={fileData} filePath={activePath} />
                ) : viewMode === 'preview' && isMarkdown ? (
                    <MarkdownPreviewViewport content={fileData?.content} />
                ) : (
                    <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
                        <Editor
                            height="100%"
                            width="100%"
                            theme="vs-dark"
                            language={getMonacoLanguage(fileData?.extension, fileData?.filename || activePath)}
                            value={fileData?.content || ''}
                            onMount={handleEditorDidMount}
                            options={{
                                readOnly: true,
                                domReadOnly: true,
                                fontSize: 12,
                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                                lineNumbers: 'on',
                                glyphMargin: Boolean(activeTab?.hasHighlight),
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

            {/* Footer Bar */}
            <div className="px-3 sm:px-4 py-1.5 bg-[#1D2024] border-t border-[#30343A] text-[11px] font-mono text-[#A0A6AF] flex items-center justify-between gap-2 select-none shrink-0">
                <span className="truncate tabular-nums">
                    {activeTab?.hasHighlight
                        ? `Lines ${activeTab.startLine}–${activeTab.endLine} (${activeTab.endLine - activeTab.startLine + 1} lines)`
                        : `${getMonacoLanguage(fileData?.extension, fileData?.filename || activePath).toUpperCase()} · ${fileData?.total_lines || 0} lines`}
                </span>
                <span className="text-[10px] text-[#747C87] hidden sm:inline">
                    {tabs.length} open tab{tabs.length > 1 ? 's' : ''} · Press Ctrl+W to close tab
                </span>
            </div>
        </div>
    );
}
