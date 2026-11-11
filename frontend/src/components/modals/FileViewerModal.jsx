import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { Icon } from '../../constants/icons';
import { getFileInfo } from '../../constants/fileIcons';
import { api } from '../../services/api';
import { fileActionsApi } from '../../services/fileActionsApi';
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
import { FileViewerErrorViewport, FileViewerFooterBar } from './FileViewerViewports';

export default function FileViewerModal({ targetFile, onClose, onToggleTreeDrawer }) {
  const [tabs, setTabs] = useState([]);
  const [activeTabPath, setActiveTabPath] = useState(null);
  const [tabDataMap, setTabDataMap] = useState({});
  const [copiedContent, setCopiedContent] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTreeOpen, setIsTreeOpen] = useState(false);

  // Editing State
  const [isSaving, setIsSaving] = useState(false);
  const [dirtyFiles, setDirtyFiles] = useState({}); // { [path]: boolean }
  const [editorContents, setEditorContents] = useState({}); // { [path]: string }

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);

  useEffect(() => {
    const detail = {
      isMinimized,
      hasTabs: tabs.length > 0,
      tabsCount: tabs.length,
      activeTab: tabs.find(t => t.path === activeTabPath) || null,
    };
    window.dispatchEvent(new CustomEvent('agentwatch:file-viewer-status', { detail }));
  }, [isMinimized, tabs, activeTabPath]);

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

  useEffect(() => {
    if (!targetFile) return;
    if (targetFile.openTree) {
      setIsTreeOpen(true);
    }
    const rawPath = targetFile.cleanPath || targetFile.path || '';
    if (!rawPath) {
      setIsMinimized(false);
      return;
    }

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
    setIsMinimized(false);
  }, [targetFile]);

  const activeTab = tabs.find(t => t.path === activeTabPath) || null;
  const activePath = activeTab?.path || '';
  const activeDataState = tabDataMap[activePath] || {
    isLoading: false,
    fileData: null,
    error: null,
    viewMode: 'code',
  };

  const loadFileContent = useCallback(
    path => {
      if (!path) return;
      setTabDataMap(prev => ({
        ...prev,
        [path]: { ...prev[path], isLoading: true, error: null },
      }));

      api
        .getFileContent(path)
        .then(data => {
          const media = classifyFileMedia(path, data);
          let defaultMode = 'code';
          if (activeTab?.hasHighlight) defaultMode = 'code';
          else if (media.isImage || media.isVideo || media.isAudio || media.isMarkdown)
            defaultMode = 'preview';

          setTabDataMap(prev => ({
            ...prev,
            [path]: {
              isLoading: false,
              fileData: data,
              error: null,
              viewMode: defaultMode,
            },
          }));
          setEditorContents(prev => ({
            ...prev,
            [path]: data?.content || '',
          }));
          setDirtyFiles(prev => ({ ...prev, [path]: false }));
        })
        .catch(err => {
          setTabDataMap(prev => ({
            ...prev,
            [path]: {
              isLoading: false,
              fileData: null,
              error: err.message || 'Could not load file content',
              viewMode: 'code',
            },
          }));
        });
    },
    [activeTab?.hasHighlight]
  );

  useEffect(() => {
    if (!activePath) return;
    const currentEntry = tabDataMap[activePath];
    if (currentEntry?.fileData || currentEntry?.isLoading || currentEntry?.error) return;
    loadFileContent(activePath);
  }, [activePath, loadFileContent, tabDataMap]);

  const handleCloseAll = useCallback(() => {
    setTabs([]);
    setActiveTabPath(null);
    setIsMinimized(false);
    setIsMaximized(false);
    if (onClose) onClose();
  }, [onClose]);

  const handleCloseTab = useCallback(
    (e, path) => {
      if (e) e.stopPropagation();
      if (dirtyFiles[path]) {
        const confirmClose = window.confirm(
          `You have unsaved changes in ${path.split('/').pop()}. Discard changes and close?`
        );
        if (!confirmClose) return;
      }
      setDirtyFiles(prev => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
      setEditorContents(prev => {
        const next = { ...prev };
        delete next[path];
        return next;
      });
      setTabs(prev => {
        const next = prev.filter(t => t.path !== path);
        if (activeTabPath === path) {
          const closedIdx = prev.findIndex(t => t.path === path);
          const nextActive = next[closedIdx] || next[closedIdx - 1] || next[0] || null;
          setActiveTabPath(nextActive ? nextActive.path : null);
          if (!nextActive) handleCloseAll();
        }
        return next;
      });
    },
    [activeTabPath, handleCloseAll, dirtyFiles]
  );

  const handleSaveCurrentFile = async () => {
    if (!activePath || isSaving) return;
    const content =
      editorContents[activePath] !== undefined
        ? editorContents[activePath]
        : activeDataState.fileData?.content;
    if (content === undefined) return;

    setIsSaving(true);
    try {
      const res = await fileActionsApi.saveFile(activePath, content);
      if (res.success) {
        toast.success(`Saved ${activeTab?.filename || 'file'}`);
        setDirtyFiles(prev => ({ ...prev, [activePath]: false }));
        setTabDataMap(prev => ({
          ...prev,
          [activePath]: {
            ...prev[activePath],
            fileData: { ...prev[activePath].fileData, content, size: res.size },
          },
        }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

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
      setTimeout(() => editor.revealLineInCenter(startLine, 0), 50);
    } else {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyHighlightDecorations(editor, monaco);

    // Ctrl+S shortcut to save file
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveCurrentFile();
    });
  };

  useEffect(() => {
    if (editorRef.current && monacoRef.current && activeDataState.viewMode === 'code') {
      applyHighlightDecorations(editorRef.current, monacoRef.current);
    }
  }, [activeDataState.fileData, activeTab, activeDataState.viewMode]);

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (isMaximized) setIsMaximized(false);
        else handleCloseAll();
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSaveCurrentFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseAll, isMaximized, activePath, editorContents]);

  if (tabs.length === 0 && !targetFile?.openTree) return null;
  if (isMinimized) return null;

  const fileData = activeDataState.fileData;
  const viewMode = activeDataState.viewMode;
  const { isImage, isVideo, isAudio, isSvg, isMedia, isMarkdown, canTogglePreview } =
    classifyFileMedia(activePath, fileData);
  const isDirty = Boolean(dirtyFiles[activePath]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Multi-File IDE Viewer & Editor"
      className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs select-none"
      onClick={handleCloseAll}
    >
      <div
        className={`w-full ${
          isMaximized
            ? 'h-full max-h-full rounded-none'
            : 'max-w-6xl h-[92vh] sm:h-[88vh] rounded-2xl'
        } bg-[#121417] border border-[#272B30] shadow-2xl flex flex-col overflow-hidden select-text animate-in fade-in zoom-in-95 duration-150 relative`}
        onClick={e => e.stopPropagation()}
      >
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
          handleCopyPath={() => {
            navigator.clipboard.writeText(activePath);
            setCopiedPath(true);
            toast.success('Path copied');
            setTimeout(() => setCopiedPath(false), 1500);
          }}
          handleCopyCode={() => {
            if (fileData?.content) {
              navigator.clipboard.writeText(fileData.content);
              setCopiedContent(true);
              toast.success('Code copied');
              setTimeout(() => setCopiedContent(false), 1500);
            }
          }}
          setIsMinimized={setIsMinimized}
          isMaximized={isMaximized}
          setIsMaximized={setIsMaximized}
          handleCloseAll={handleCloseAll}
          isDirty={isDirty}
          isSaving={isSaving}
          onSaveFile={handleSaveCurrentFile}
        />

        <div className="flex-1 flex overflow-hidden min-h-0 bg-[#0E1013] relative">
          <FileViewerTreePanel
            isOpen={isTreeOpen}
            activeFilePath={activePath}
            onOpenFile={path => {
              if (!path) return;
              const pathKey = path.replace(/\\/g, '/');
              setTabs(prev =>
                prev.some(t => t.path === pathKey)
                  ? prev
                  : [...prev, { id: pathKey, path: pathKey, filename: pathKey.split('/').pop() }]
              );
              setActiveTabPath(pathKey);
            }}
            onClose={() => setIsTreeOpen(false)}
          />

          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
            {activeDataState.isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#A0A6AF] space-y-2 flex-1">
                <span className="w-5 h-5 rounded-full border-2 border-[#7C9FC5] border-t-transparent animate-spin" />
                <span className="text-xs font-mono">Loading file...</span>
              </div>
            ) : activeDataState.error ? (
              <FileViewerErrorViewport
                error={activeDataState.error}
                activePath={activePath}
                onRetry={() => loadFileContent(activePath)}
              />
            ) : tabs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
                <div className="w-12 h-12 rounded-xl bg-[#1A1D22] border border-[#2D3138] flex items-center justify-center text-[#747C87] mb-3">
                  <div className="w-6 h-6">{Icon.folderOpen}</div>
                </div>
                <h3 className="text-sm font-semibold text-[#E8EAED] mb-1">No File Open</h3>
                <p className="text-xs text-[#747C87] max-w-sm mb-4 leading-relaxed">
                  Select a file from the project tree on the left to inspect, edit, or preview it.
                </p>
                {!isTreeOpen && (
                  <button
                    type="button"
                    onClick={() => setIsTreeOpen(true)}
                    className="px-3 py-1.5 rounded-md bg-[#1D2024] hover:bg-[#262A30] border border-[#30343A] text-xs font-medium text-[#E8EAED] transition cursor-pointer flex items-center gap-1.5"
                  >
                    <div className="w-3.5 h-3.5 text-amber-400">{Icon.folder}</div>
                    <span>Open Project Files</span>
                  </button>
                )}
              </div>
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
              <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden">
                <Editor
                  height="100%"
                  width="100%"
                  theme="vs-dark"
                  language={getMonacoLanguage(
                    fileData?.extension,
                    fileData?.filename || activePath
                  )}
                  value={
                    editorContents[activePath] !== undefined
                      ? editorContents[activePath]
                      : fileData?.content || ''
                  }
                  onChange={val => {
                    const nextVal = val ?? '';
                    const originalVal = fileData?.content ?? '';
                    setEditorContents(prev => ({ ...prev, [activePath]: nextVal }));
                    setDirtyFiles(prev => ({ ...prev, [activePath]: nextVal !== originalVal }));
                  }}
                  onMount={handleEditorDidMount}
                  options={{
                    readOnly: false,
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
