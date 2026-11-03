import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Icon } from '../../constants/icons';
import { FileIcon, getFileInfo } from '../../constants/fileIcons';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';
import {
  classifyFileMedia,
  getMonacoLanguage,
  MediaPreviewViewport,
  MarkdownPreviewViewport,
} from './FileViewerHelpers';
import { BinaryFileViewport } from './BinaryFileViewport';
import { FileViewerTabBar } from './FileViewerTabBar';
import { FileViewerTreePanel } from './FileViewerTreePanel';
import {
  FileViewerErrorViewport,
  FileViewerFooterBar,
} from './FileViewerViewports';

export default function FileViewerModal({ targetFile, onClose, onToggleTreeDrawer }) {
  const [tabs, setTabs] = useState([]);
  const [activeTabPath, setActiveTabPath] = useState(null);
  const [tabDataMap, setTabDataMap] = useState({}); // { [path]: { fileData, isLoading, error, viewMode } }
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTreeOpen, setIsTreeOpen] = useState(false);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  // Broadcast minimized state and tabs to window so PromptComposer can display an inline badge
  useEffect(() => {
    const detail = {
      isMinimized,
      hasTabs: tabs.length > 0,
      tabsCount: tabs.length,
      activeTab: tabs.find(t => t.path === activeTabPath) || null,
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
          hasHighlight,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: pathKey,
          path: pathKey,
          filename,
          startLine,
          endLine,
          hasHighlight,
        },
      ];
    });

    setActiveTabPath(pathKey);
    if (targetFile.openTree) {
      setIsTreeOpen(true);
    }
    setIsMinimized(false); // Auto restore if minimized when a new file or tab is opened
  }, [targetFile]);

  // Active tab and its data
  const activeTab = tabs.find(t => t.path === activeTabPath) || null;
  const activePath = activeTab?.path || '';
  const activeDataState = tabDataMap[activePath] || {
    isLoading: false,
    fileData: null,
    error: null,
    viewMode: 'code',
  };

  // Fetch active tab file content if not already loaded or failed
  useEffect(() => {
    if (!activePath) return;
    const currentEntry = tabDataMap[activePath];
    if (currentEntry?.fileData || currentEntry?.isLoading || currentEntry?.error) return;

    setTabDataMap(prev => ({
      ...prev,
      [activePath]: { ...prev[activePath], isLoading: true, error: null },
    }));

    api
      .getFileContent(activePath)
      .then(data => {
        const media = classifyFileMedia(activePath, data);
        let defaultMode = 'code';
        if (activeTab?.hasHighlight) defaultMode = 'code';
        else if (media.isImage || media.isVideo || media.isAudio || media.isMarkdown) defaultMode = 'preview';

        setTabDataMap(prev => ({
          ...prev,
          [activePath]: {
            isLoading: false,
            fileData: data,
            error: null,
            viewMode: defaultMode,
          },
        }));
      })
      .catch(err => {
        setTabDataMap(prev => ({
          ...prev,
          [activePath]: {
            isLoading: false,
            fileData: null,
            error: err.message || 'Could not load file content',
            viewMode: 'code',
          },
        }));
      });
  }, [
    activePath,
    activeTab?.hasHighlight,
    tabDataMap[activePath]?.fileData,
    tabDataMap[activePath]?.isLoading,
    tabDataMap[activePath]?.error,
  ]);

  // Close all tabs and dismiss modal completely
  const handleOpenFileFromTree = useCallback((path) => {
    if (!path) return;
    const pathKey = path.replace(/\\/g, '/');
    const filename = pathKey.split('/').pop() || 'File';
    setTabs(prev => {
      const existingIdx = prev.findIndex(t => t.path === pathKey);
      if (existingIdx !== -1) return prev;
      return [
        ...prev,
        {
          id: pathKey,
          path: pathKey,
          filename,
          startLine: null,
          endLine: null,
          hasHighlight: false,
        },
      ];
    });
    setActiveTabPath(pathKey);
  }, []);

  const handleCloseAll = useCallback(() => {
    setTabs([]);
    setActiveTabPath(null);
    setIsMinimized(false);
    setIsMaximized(false);
    if (onClose) onClose();
  }, [onClose]);

  // Handle close individual tab
  const handleCloseTab = useCallback(
    (e, path) => {
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
    },
    [activeTabPath, handleCloseAll]
  );

  // Highlights in Monaco
  const applyHighlightDecorations = (editor, monaco) => {
    if (!editor || !monaco) return;
    const startLine = activeTab?.startLine;
    const endLine = activeTab?.endLine;
    if (activeTab?.hasHighlight && startLine > 0) {
      const targetEnd = endLine && endLine >= startLine ? endLine : startLine;
      const newDecorations = [
        {
          range: new monaco.Range(startLine, 1, targetEnd, 1),
          options: {
            isWholeLine: true,
            className: 'monaco-highlight-line',
            glyphMarginClassName: 'monaco-highlight-glyph',
            linesDecorationsClassName: 'monaco-highlight-glyph',
          },
        },
      ];
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
      setTimeout(() => {
        editor.revealLineInCenter(startLine, 0);
      }, 50);
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
    const handleKeyDown = e => {
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

  // If no tabs are open and no targetFile or openTree request, render nothing
  if (tabs.length === 0 && !targetFile?.openTree) return null;

  const fileData = activeDataState.fileData;
  const viewMode = activeDataState.viewMode;
  const { isImage, isVideo, isAudio, isSvg, isMedia, isMarkdown, canTogglePreview } =
    classifyFileMedia(activePath, fileData);
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

  // 1. Minimized state: Handled cleanly inside the PromptComposer toolbar badge
  if (isMinimized) {
    return null;
  }

  // 2. Consistent Centered Modal (Mobile, Tablet, Desktop)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Multi-File IDE Viewer"
      className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs select-none"
      onClick={handleCloseAll}
    >
      <div
        className={`w-full ${
          isMaximized ? 'h-full max-h-full rounded-none' : 'max-w-6xl h-[92vh] sm:h-[88vh] rounded-2xl'
        } bg-[#121417] border border-[#272B30] shadow-2xl flex flex-col overflow-hidden select-text animate-in fade-in zoom-in-95 duration-150`}
        onClick={e => e.stopPropagation()}
      >
      {/* IDE Horizontal Tab Bar */}
      <FileViewerTabBar
        tabs={tabs}
        activeTabPath={activeTabPath}
        setActiveTabPath={setActiveTabPath}
        handleCloseTab={handleCloseTab}
        isTreeOpen={isTreeOpen}
        onToggleTree={() => setIsTreeOpen(prev => !prev)}
        canTogglePreview={canTogglePreview}
        viewMode={viewMode}
        activePath={activePath}
        setTabDataMap={setTabDataMap}
        copiedPath={copiedPath}
        copiedContent={copiedContent}
        fileData={fileData}
        handleCopyPath={handleCopyPath}
        handleCopyCode={handleCopyCode}
        setIsMinimized={setIsMinimized}
        isMaximized={isMaximized}
        setIsMaximized={setIsMaximized}
        handleCloseAll={handleCloseAll}
      />

      {/* Subheader: Active File Path & Breadcrumb */}
      {activePath && (
        <div className="px-3.5 sm:px-4 py-1.5 bg-[#15171B] border-b border-[#22262B] text-[11px] font-mono text-[#8A929B] flex items-center justify-between select-all shrink-0">
          <div className="flex items-center gap-1.5 truncate min-w-0">
            <span className="text-[#5D6570] text-[10px]">path:</span>
            <span className="truncate text-[#C4C7C5]">{activePath}</span>
          </div>
          {fileInfo.label && (
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-medium uppercase tracking-wider bg-[#1A1D22] text-[#A0A6AF] border border-[#2D3138] shrink-0 ml-2">
              {fileInfo.label}
            </span>
          )}
        </div>
      )}

      {/* Middle Row: Collapsible Tree Panel + Main Viewport Body */}
      <div className="flex-1 min-h-0 flex flex-row overflow-hidden relative w-full">
        {/* Left Tree Explorer Panel */}
        <FileViewerTreePanel
          isOpen={isTreeOpen}
          onClose={() => setIsTreeOpen(false)}
          activeFilePath={activePath}
          onOpenFile={handleOpenFileFromTree}
        />

        {/* Viewport Body */}
        <div className="flex-1 min-h-0 overflow-hidden bg-[#101113] flex flex-col relative w-full">
        {!activePath ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#747C87] space-y-3 flex-1 select-none">
            <div className="w-10 h-10 rounded-xl bg-[#1A1D22] border border-[#2D3138] flex items-center justify-center text-amber-400 shadow-sm">
              <div className="w-5 h-5">{Icon.folder}</div>
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-medium text-[#E8EAED]">No File Selected</p>
              <p className="text-[11px] font-mono text-[#747C87]">Choose a file from the explorer on the left to preview or edit</p>
            </div>
          </div>
        ) : activeDataState.isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#A0A6AF] space-y-2 flex-1">
            <span className="w-5 h-5 rounded-full border-2 border-[#7C9FC5] border-t-transparent animate-spin" />
            <span className="text-xs font-mono">Loading file contents...</span>
          </div>
        ) : activeDataState.error ? (
          <FileViewerErrorViewport
            error={activeDataState.error}
            activePath={activePath}
            onRetry={() => {
              setTabDataMap(prev => ({
                ...prev,
                [activePath]: null,
              }));
            }}
          />
        ) : fileData?.is_binary ? (
          <BinaryFileViewport fileData={fileData} activePath={activePath} />
        ) : isMedia && (!isSvg || viewMode === 'preview') ? (
          <MediaPreviewViewport
            isImage={isImage}
            isVideo={isVideo}
            isAudio={isAudio}
            fileData={fileData}
            filePath={activePath}
          />
        ) : viewMode === 'preview' && isMarkdown ? (
          <MarkdownPreviewViewport content={fileData?.content} />
        ) : (
          <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden group/editor">
            {/* Hover Floating Copy Code Button */}
            {fileData?.content && (
              <button
                type="button"
                onClick={handleCopyCode}
                title="Copy entire file content"
                className="absolute top-3 right-6 z-20 opacity-0 group-hover/editor:opacity-100 transition-all duration-150 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#16181C]/90 hover:bg-[#202328] border border-[#2D3138] hover:border-[#3D424B] text-[11px] font-mono text-[#C4C7C5] hover:text-[#E8EAED] shadow-md backdrop-blur-md cursor-pointer select-none"
              >
                <div className="w-3.5 h-3.5 text-cyan-400">
                  {copiedContent ? Icon.check : Icon.copy}
                </div>
                <span>{copiedContent ? 'Copied!' : 'Copy Code'}</span>
              </button>
            )}

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
                padding: { top: 10, bottom: 10 },
              }}
            />
          </div>
        )}
        </div>
      </div>

      {/* Footer Bar */}
      <FileViewerFooterBar
        activeTab={activeTab}
        fileData={fileData}
        activePath={activePath}
        language={getMonacoLanguage(fileData?.extension, fileData?.filename || activePath)}
        tabsCount={tabs.length}
      />
      </div>
    </div>
  );
}
