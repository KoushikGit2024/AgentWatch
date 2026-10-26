import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../constants/icons';
import { api } from '../services/api';
import { toast } from '../services/toastService';
import AttachmentPreview from './chat/AttachmentPreview';
import WorkbenchBar from './composer/WorkbenchBar';
import AttachmentLightbox from './composer/AttachmentLightbox';
import AssetManagerModal from './modals/AssetManagerModal';
import { FileIcon } from '../constants/fileIcons';

export function PromptComposer({
  promptText,
  onChangePrompt,
  onSend,
  isSending,
  isWorking = false,
  appState,
  onOpenModelModal,
  onOpenReviewChanges,
  onOpenFile,
  recoveryCount = 0,
  onStop,
  onQueue,
}) {
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false);
  const [minimizedViewerStatus, setMinimizedViewerStatus] = useState(null);

  const [activeAttachedTab, setActiveAttachedTab] = useState(null);
  const [artifactsList, setArtifactsList] = useState([]);
  const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
  const [ideTerminalTasks, setIdeTerminalTasks] = useState([]);
  const [isLoadingTerminal, setIsLoadingTerminal] = useState(false);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onViewerStatus = e => {
      if (e.detail) {
        setMinimizedViewerStatus(e.detail);
      }
    };
    window.addEventListener('agentwatch:file-viewer-status', onViewerStatus);
    return () => window.removeEventListener('agentwatch:file-viewer-status', onViewerStatus);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchTasks = async () => {
      try {
        const res = await api.getTerminalTasks();
        if (isMounted && res?.tasks) {
          setIdeTerminalTasks(res.tasks);
        }
      } catch {}
    };
    fetchTasks();
    const interval = setInterval(fetchTasks, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (previewItem) setPreviewItem(null);
        if (activeAttachedTab) setActiveAttachedTab(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewItem, activeAttachedTab]);

  const handleToggleAttachedTab = async tabName => {
    if (activeAttachedTab === tabName) {
      setActiveAttachedTab(null);
      return;
    }
    setActiveAttachedTab(tabName);
    if (tabName === 'artifacts') {
      setIsLoadingArtifacts(true);
      try {
        const res = await api.getArtifacts();
        setArtifactsList(res?.artifacts || []);
      } catch (err) {
        toast.error(err.message || 'Could not load artifacts', 'Artifacts');
      } finally {
        setIsLoadingArtifacts(false);
      }
    } else if (tabName === 'terminal') {
      setIsLoadingTerminal(true);
      try {
        const tasksRes = await api.getTerminalTasks();
        if (tasksRes?.tasks && tasksRes.tasks.length > 0) {
          setIdeTerminalTasks(tasksRes.tasks);
        } else {
          const toggleRes = await api.toggleTerminal();
          if (toggleRes?.tasks && Array.isArray(toggleRes.tasks)) {
            setIdeTerminalTasks(toggleRes.tasks);
          }
        }
      } catch (err) {
        console.error('Terminal sync error:', err);
      } finally {
        setIsLoadingTerminal(false);
      }
    }
  };

  const handleKillIdeTerminalTask = async (taskIndex, tooltipId) => {
    try {
      await api.killTerminalTask(taskIndex, tooltipId);
      setIdeTerminalTasks(prev => prev.filter((_, idx) => idx !== taskIndex));
      setTimeout(async () => {
        try {
          const refreshed = await api.getTerminalTasks();
          if (refreshed?.tasks) setIdeTerminalTasks(refreshed.tasks);
        } catch {}
      }, 300);
    } catch (err) {
      toast.error(err.message || 'Could not terminate command in IDE', 'Terminal');
    }
  };

  const handleUploadFiles = async fileList => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    if (attachments.length + filesArray.length > 8) {
      toast.warning('Maximum 8 attachments allowed per prompt', 'Upload Limit');
      return;
    }

    const optimisticItems = filesArray.map((f, i) => {
      const isImg = f.type.startsWith('image/') || f.name.match(/\.(png|jpe?g|webp|gif|svg)$/i);
      return {
        id: `opt_${Date.now()}_${i}`,
        original_name: f.name,
        filename: f.name,
        size: f.size,
        is_image: isImg,
        previewUrl: isImg ? URL.createObjectURL(f) : null,
        isPending: true,
      };
    });

    setAttachments(prev => [...prev, ...optimisticItems]);
    setIsUploading(true);

    try {
      const res = await api.uploadAttachments(filesArray);
      if (res && res.attachments) {
        const uploaded = res.attachments;
        setAttachments(prev => {
          const nonPending = prev.filter(p => !optimisticItems.some(o => o.id === p.id));
          return [...nonPending, ...uploaded];
        });
        toast.success(
          `Attached ${uploaded.length} file${uploaded.length > 1 ? 's' : ''}`,
          'Attachment Uploaded'
        );
      }
    } catch (err) {
      setAttachments(prev => prev.filter(p => !optimisticItems.some(o => o.id === p.id)));
      toast.error(err.message || 'Failed to upload attachments', 'Upload Error');
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = e => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const filesToUpload = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          let fileName = file.name;
          if (!fileName || fileName === 'image.png' || fileName === 'blob') {
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            fileName = `Pasted_Image_${timeStr}.png`;
          }
          filesToUpload.push(new File([file], fileName, { type: file.type || 'image/png' }));
        }
      }
    }
    if (filesToUpload.length > 0) {
      e.preventDefault();
      handleUploadFiles(filesToUpload);
    }
  };

  const readyAttachments = attachments.filter(a => !a.isPending);
  const canSend =
    (Boolean(promptText && promptText.trim()) || readyAttachments.length > 0) &&
    !isSending &&
    !isUploading;

  const handleTriggerSend = () => {
    if (!canSend) return;
    onSend(promptText, readyAttachments);
    setAttachments([]);
  };

  const handleTriggerQueue = () => {
    if (!canSend) return;
    if (onQueue) onQueue(promptText, readyAttachments);
    else onSend(promptText, readyAttachments);
    setAttachments([]);
  };

  return (
    <div className="aw-landscape-compact-composer px-2.5 sm:px-4 py-2.5 bg-[#17191C] border-t border-[#30343A] shrink-0 pb-safe select-none">
      <div className="aw-chat-column space-y-2">
        <WorkbenchBar
          activeAttachedTab={activeAttachedTab}
          onToggleAttachedTab={handleToggleAttachedTab}
          onCloseTab={() => setActiveAttachedTab(null)}
          onOpenReviewChanges={onOpenReviewChanges}
          onOpenFile={onOpenFile}
          recoveryCount={recoveryCount}
          isLoadingTerminal={isLoadingTerminal}
          ideTerminalTasks={ideTerminalTasks}
          onKillTerminalTask={handleKillIdeTerminalTask}
          isLoadingArtifacts={isLoadingArtifacts}
          artifactsList={artifactsList}
        />

        <div
          onDragOver={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
          }}
          onDragLeave={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
          }}
          onDrop={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer?.files?.length > 0) handleUploadFiles(e.dataTransfer.files);
          }}
          className={`rounded-lg bg-[#101113] border p-2.5 sm:p-3 transition-all relative ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
              : 'border-[#30343A] focus-within:border-blue-500/60 focus-within:ring-1 focus-within:ring-blue-500/20'
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 z-10 rounded-lg bg-[#101113]/90 flex items-center justify-center text-blue-400 font-medium text-xs pointer-events-none gap-2">
              <div className="w-4 h-4">{Icon.paperclip}</div>
              <span>Drop images or files here to attach</span>
            </div>
          )}

          <AttachmentPreview
            attachments={attachments}
            onRemove={idx => setAttachments(prev => prev.filter((_, i) => i !== idx))}
            onPreviewImage={att => setPreviewItem(att)}
          />

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={e => handleUploadFiles(e.target.files)}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={e => handleUploadFiles(e.target.files)}
            className="hidden"
          />

          <textarea
            value={promptText}
            onChange={e => onChangePrompt(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (isWorking) handleTriggerQueue();
                else handleTriggerSend();
              }
            }}
            aria-label="Prompt input"
            placeholder="Enter instructions, paste or attach files, @ mention, / actions..."
            rows={2}
            className="aw-landscape-compact-textarea w-full bg-transparent text-xs sm:text-sm text-[#E8EAED] placeholder-[#747C87] resize-none outline-none max-h-36 leading-relaxed select-text"
          />

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#262A30] text-xs">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap min-w-0">
              <button
                type="button"
                onClick={onOpenModelModal}
                title={appState?.model ? `Active Model: ${appState.model}` : 'Select Plan Model'}
                className="aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#17191C] hover:bg-[#1D2024] text-[#E8EAED] border border-[#30343A] hover:border-violet-500/30 transition cursor-pointer max-w-[150px] sm:max-w-[220px]"
              >
                <div className="w-3.5 h-3.5 text-violet-400 shrink-0 group-hover:scale-110 transition-transform">
                  {Icon.cpu}
                </div>
                <span className="truncate text-[11px] sm:text-xs font-medium">
                  {appState?.model || 'Select model...'}
                </span>
                <div className="w-3 h-3 text-[#747C87] group-hover:text-[#A0A6AF] shrink-0 transition-colors">
                  {Icon.chevronDown}
                </div>
              </button>

              <div className="h-3.5 w-px bg-[#262A30] mx-0.5" />

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Attach Image"
                title="Attach Image (PNG, JPG, WEBP)"
                className="aw-focus-ring group p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer disabled:opacity-40"
              >
                <div className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform">
                  {Icon.image}
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                aria-label="Attach File"
                title="Attach File (Code, Config, Logs, Docs)"
                className="aw-focus-ring group p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer disabled:opacity-40"
              >
                <div className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform">
                  {Icon.paperclip}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsAssetManagerOpen(true)}
                aria-label="Open Asset & Upload Manager"
                title="Manage Uploads (Browse, Reuse, Preview & Delete Assets)"
                className="aw-focus-ring group p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
              >
                <div className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform">
                  {Icon.folderOpen}
                </div>
              </button>

              {/* Distinguishable Minimized File Viewer Button in Toolbar */}
              {minimizedViewerStatus?.isMinimized && minimizedViewerStatus?.hasTabs && (
                <div className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-md bg-[#7C9FC5]/15 border border-[#7C9FC5]/40 text-[#7C9FC5] hover:bg-[#7C9FC5]/25 transition-all shadow-xs animate-in fade-in duration-150">
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('agentwatch:file-viewer-restore'))
                    }
                    title={`Restore File Viewer: ${minimizedViewerStatus.activeTab?.filename || 'File'}`}
                    className="aw-focus-ring flex items-center gap-1.5 cursor-pointer max-w-[120px] xs:max-w-[160px]"
                  >
                    <div className="w-3.5 h-3.5 shrink-0 text-[#7C9FC5]">
                      <FileIcon
                        path={minimizedViewerStatus.activeTab?.path || ''}
                        className="w-3.5 h-3.5"
                      />
                    </div>
                    <span className="text-[11px] font-mono font-medium text-[#E8EAED] truncate">
                      {minimizedViewerStatus.activeTab?.filename || 'File Viewer'}
                    </span>
                    <span className="text-[9px] px-1 rounded bg-[#7C9FC5]/20 text-[#7C9FC5] font-mono shrink-0">
                      {minimizedViewerStatus.tabsCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('agentwatch:file-viewer-restore'))
                    }
                    title="Expand Window"
                    className="p-0.5 rounded hover:bg-[#7C9FC5]/30 text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer"
                  >
                    <div className="w-3 h-3">{Icon.maximize}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('agentwatch:file-viewer-close'))
                    }
                    title="Close File Viewer"
                    className="p-0.5 rounded hover:bg-rose-500/30 text-[#A0A6AF] hover:text-rose-300 transition cursor-pointer"
                  >
                    <div className="w-3 h-3">{Icon.x}</div>
                  </button>
                </div>
              )}

              {isUploading && (
                <span className="inline-flex items-center gap-1.5 text-[10px] text-blue-400 font-mono">
                  <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                  <span>Uploading...</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isWorking ? (
                <>
                  <button
                    type="button"
                    disabled={!canSend}
                    onClick={handleTriggerQueue}
                    title="Queue follow-up message"
                    className="aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#1D2024] hover:bg-[#23272D] disabled:opacity-40 disabled:cursor-not-allowed text-[#E8EAED] border border-[#30343A] hover:border-blue-500/40 font-medium text-xs transition cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform">
                      {Icon.send}
                    </div>
                    <span>Queue</span>
                  </button>
                  <button
                    type="button"
                    onClick={onStop}
                    title="Stop agent run"
                    className="aw-focus-ring flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 font-semibold text-xs transition cursor-pointer"
                  >
                    <div className="w-3.5 h-3.5 text-rose-400">{Icon.stop}</div>
                    <span>Stop</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={handleTriggerSend}
                  aria-label="Send prompt"
                  title="Send prompt (Enter)"
                  className="aw-focus-ring group flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-35 disabled:cursor-not-allowed text-white shadow-sm font-semibold text-xs transition cursor-pointer"
                >
                  <div className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform">
                    {Icon.send}
                  </div>
                  <span>Send</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Graceful Footer: Author Copyright & GitHub Repository Link */}
        <div className="flex items-center justify-center gap-1.5 pt-1.5 text-[10px] font-mono text-[#747C87] select-none">
          <span>© {new Date().getFullYear()}</span>
          <span className="text-[#A0A6AF] font-medium">Koushik Kar</span>
          <span className="text-[#30343A]">·</span>
          <a
            href="https://github.com/KoushikGit2024/AgentWatch"
            target="_blank"
            rel="noopener noreferrer"
            title="View AgentWatch on GitHub"
            className="inline-flex items-center gap-1 text-[#747C87] hover:text-[#7C9FC5] transition-colors focus:outline-none"
          >
            <div className="w-3 h-3">{Icon.github}</div>
            <span>AgentWatch</span>
          </a>
        </div>
      </div>

      <AttachmentLightbox item={previewItem} onClose={() => setPreviewItem(null)} />

      <AssetManagerModal
        isOpen={isAssetManagerOpen}
        onClose={() => setIsAssetManagerOpen(false)}
        onSelectAttachment={selected => {
          setAttachments(prev => {
            if (prev.some(a => a.filename === selected.filename)) return prev;
            return [...prev, selected];
          });
        }}
        onPreviewItem={att => setPreviewItem(att)}
      />
    </div>
  );
}
