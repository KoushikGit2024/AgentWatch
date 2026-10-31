import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../constants/icons';
import { api } from '../services/api';
import { toast } from '../services/toastService';
import AttachmentPreview from './chat/AttachmentPreview';
import WorkbenchBar from './composer/WorkbenchBar';
import AttachmentLightbox from './composer/AttachmentLightbox';
import AssetManagerModal from './modals/AssetManagerModal';
import TaskOutputModal from './modals/TaskOutputModal';
import AntigravityTerminalPanel from './terminal/AntigravityTerminalPanel';
import { useComposerAttachments } from './composer/useComposerAttachments';
import { useWorkbenchTasks } from './composer/useWorkbenchTasks';
import { useTaskExecutionTimers } from '../hooks/useTaskExecutionTimers';
import { MinimizedViewerBadge } from './composer/MinimizedViewerBadge';
import { ComposerFooter } from './composer/ComposerFooter';
import { ModelSelectorButton } from './composer/ModelSelectorButton';

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
  const {
    attachments,
    setAttachments,
    isUploading,
    isDragging,
    previewItem,
    setPreviewItem,
    imageInputRef,
    fileInputRef,
    handleUploadFiles,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useComposerAttachments();
  const [isAssetManagerOpen, setIsAssetManagerOpen] = useState(false);
  const [minimizedViewerStatus, setMinimizedViewerStatus] = useState(null);
  const [activeAttachedTab, setActiveAttachedTab] = useState(null);
  const [inspectingTask, setInspectingTask] = useState(null);
  const [isTerminalPanelOpen, setIsTerminalPanelOpen] = useState(false);
  const [selectedTerminalTaskId, setSelectedTerminalTaskId] = useState(null);

  const {
    artifactsList,
    isLoadingArtifacts,
    ideTerminalTasks,
    isLoadingTerminal,
    handleToggleAttachedTab,
    handleRefreshTerminalTasks,
    handleKillIdeTerminalTask,
  } = useWorkbenchTasks(appState?.active_conversation_id, activeAttachedTab, setActiveAttachedTab);

  const { timers: taskTimers, formatDuration } = useTaskExecutionTimers(ideTerminalTasks);

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
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (previewItem) setPreviewItem(null);
        if (activeAttachedTab) setActiveAttachedTab(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewItem, activeAttachedTab]);

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
          onInspectTask={task => setInspectingTask(task)}
          taskTimers={taskTimers}
          formatDuration={formatDuration}
          onRefreshTerminal={handleRefreshTerminalTasks}
          isLoadingArtifacts={isLoadingArtifacts}
          artifactsList={artifactsList}
          onOpenTerminalPanel={() => setIsTerminalPanelOpen(true)}
        />

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
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
              <ModelSelectorButton appState={appState} onOpenModelModal={onOpenModelModal} />

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
              <MinimizedViewerBadge status={minimizedViewerStatus} />

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
        <ComposerFooter />
      </div>

      <AttachmentLightbox item={previewItem} onClose={() => setPreviewItem(null)} />

      <AssetManagerModal
        isOpen={isAssetManagerOpen}
        onClose={() => setIsAssetManagerOpen(false)}
        activeConversationId={appState?.active_conversation_id}
        onSelectAttachment={selected => {
          setAttachments(prev => {
            if (prev.some(a => a.filename === selected.filename)) return prev;
            return [...prev, selected];
          });
        }}
        onPreviewItem={att => setPreviewItem(att)}
      />

      <TaskOutputModal
        isOpen={Boolean(inspectingTask)}
        task={inspectingTask}
        onClose={() => setInspectingTask(null)}
      />

      <AntigravityTerminalPanel
        isOpen={isTerminalPanelOpen}
        onClose={() => setIsTerminalPanelOpen(false)}
        initialTasks={ideTerminalTasks}
        onKillTask={handleKillIdeTerminalTask}
        activeTaskId={selectedTerminalTaskId}
        onSelectTask={id => setSelectedTerminalTaskId(id)}
      />
    </div>
  );
}
