import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import ChatStream from './components/chat/ChatStream';
import PendingInteractionBanner from './components/chat/PendingInteractionBanner';
import QueuedMessagesCard from './components/chat/QueuedMessagesCard';
import { PromptComposer } from './components/composer/PromptComposer';
import { AppDrawersAndModals } from './components/AppDrawersAndModals';
import { ScreenViewport } from './components/ScreenViewport';
import ToastContainer from './components/ToastContainer';
import { toast } from './services/toastService';
import { useAgentWatch } from './hooks/useAgentWatch';
import { useQueuedMessages } from './hooks/useQueuedMessages';
import { parseFileLink } from './utils/fileLinkParser';
import { Icon } from './constants/icons';

export default function App() {
  const [viewMode, setViewMode] = useState('chat');
  const [fitMode, setFitMode] = useState('fit');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [taskManagerOpen, setTaskManagerOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reviewChangesOpen, setReviewChangesOpen] = useState(false);
  const [gitGraphOpen, setGitGraphOpen] = useState(false);
  const [activeFileViewer, setActiveFileViewer] = useState(null);
  const [portForwardingOpen, setPortForwardingOpen] = useState(false);

  const handleOpenFile = useCallback((rawPath, lineRange = {}) => {
    const parsed = parseFileLink(rawPath);
    if (lineRange.startLine != null) parsed.startLine = lineRange.startLine;
    if (lineRange.endLine != null) parsed.endLine = lineRange.endLine;

    if (parsed.startLine != null && parsed.endLine == null) {
      parsed.endLine = parsed.startLine;
    } else if (
      parsed.startLine != null &&
      parsed.endLine != null &&
      parsed.startLine > parsed.endLine
    ) {
      const tmp = parsed.startLine;
      parsed.startLine = parsed.endLine;
      parsed.endLine = tmp;
    }

    parsed.hasHighlight = parsed.startLine != null && parsed.startLine > 0;
    if (parsed.isValid && parsed.cleanPath) {
      setActiveFileViewer({ ...parsed });
    }
  }, []);

  useEffect(() => {
    const onCustomOpenFile = e => {
      if (e.detail?.path) handleOpenFile(e.detail.path, e.detail);
    };
    window.addEventListener('agentwatch:open-file', onCustomOpenFile);
    return () => window.removeEventListener('agentwatch:open-file', onCustomOpenFile);
  }, [handleOpenFile]);

  const {
    appState,
    snapshotData,
    isSnapshotLoading,
    chatMessages,
    isChatLoading,
    hasMoreHistory,
    isLoadingOlder,
    loadOlderMessages,
    pendingInteraction,
    isInteractionMinimized,
    selectedOptions,
    customResponse,
    isSubmitting,
    submitSuccess,
    isSendingPrompt,
    systemLogs,
    isLogsLoading,
    recoveryItems,
    isRecoveryLoading,
    diagnostics,
    historyChats,
    isHistoryLoading,
    approvals,
    pendingApproval,
    isApprovalMinimized,
    isApprovaling,
    setCustomResponse,
    handleApproval,
    handleDismissApproval,
    handleReopenApproval,
    handleDismissInteraction,
    handleCancelInteraction,
    handleReopenInteraction,
    handleSendPrompt,
    handleInteractionSubmit,
    handleRespondDirectQuestion,
    handleToggleOption,
    handleSetModel,
    handleSetMode,
    handleStopAgent,
    handleSwitchConversation,
    handleStartNewConversation,
    fetchAppState,
    fetchSystemLogs,
    fetchRecoveryItems,
    fetchHistoryChats,
  } = useAgentWatch({ isScreenActive: viewMode === 'screen' || lightboxOpen });

  const [promptText, setPromptText] = useState('');
  const [openItemIds, setOpenItemIds] = useState(new Set());
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  const toggleItem = useCallback(itemId => {
    setOpenItemIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const handleChatScroll = useCallback(e => {
    const el = e.currentTarget;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 90;
    shouldAutoScrollRef.current = isNearBottom;
    setIsScrolledUp(!isNearBottom);
  }, []);

  const scrollAnimationRef = useRef(null);

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    shouldAutoScrollRef.current = true;
    setIsScrolledUp(false);
    const el = chatScrollRef.current;
    if (!el) return;

    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
      scrollAnimationRef.current = null;
    }

    const startTop = el.scrollTop;
    const targetTop = el.scrollHeight - el.clientHeight;
    const distance = targetTop - startTop;

    if (distance <= 0) return;

    // Instant jump for tiny distances or when explicitly requested
    if (behavior === 'auto') {
      el.scrollTop = el.scrollHeight;
      return;
    }

    // Controlled smooth cubic ease-out animation (capped at 220ms so it never stalls or requires multiple clicks)
    const duration = Math.min(220, Math.max(120, distance * 0.08));
    const startTime = performance.now();

    const animateScroll = currentTime => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease out: fast initial motion, smooth finish
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Dynamically read el.scrollHeight in case incoming turns expand it mid-animation
      const currentTarget = el.scrollHeight - el.clientHeight;
      el.scrollTop = startTop + (currentTarget - startTop) * easeOut;

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(animateScroll);
      } else {
        el.scrollTop = el.scrollHeight;
        scrollAnimationRef.current = null;
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(animateScroll);
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const rawIsAgentWorking =
    chatMessages.length > 0 &&
    chatMessages[chatMessages.length - 1]?.role === 'agent' &&
    Boolean(chatMessages[chatMessages.length - 1]?.is_working);

  const [isAgentWorking, setIsAgentWorking] = useState(false);
  const workingDebounceTimerRef = useRef(null);

  useEffect(() => {
    if (rawIsAgentWorking) {
      if (workingDebounceTimerRef.current) {
        clearTimeout(workingDebounceTimerRef.current);
        workingDebounceTimerRef.current = null;
      }
      setIsAgentWorking(true);
    } else {
      // Apply a grace period of 2.5s before transitioning from working to idle
      // to absorb step-transition gaps or transient retries
      workingDebounceTimerRef.current = setTimeout(() => {
        setIsAgentWorking(false);
        workingDebounceTimerRef.current = null;
      }, 2500);
    }
    return () => {
      if (workingDebounceTimerRef.current) {
        clearTimeout(workingDebounceTimerRef.current);
      }
    };
  }, [rawIsAgentWorking]);

  const {
    queuedMessages,
    isActionPending: isQueueActionPending,
    handleSendNow: handleQueueSendNow,
    handleDelete: handleQueueDelete,
    handleQueueMessage,
  } = useQueuedMessages(isAgentWorking);

  const handleQueueEdit = async item => {
    if (!item) return;
    setPromptText(item.text || '');
    await handleQueueDelete(item);
    toast.info('Message loaded into composer for editing', 'Editing Queued Prompt');
  };

  const handleSend = (text, attachments = []) => {
    const msg = text !== undefined ? text : promptText;
    if (!msg?.trim() && (!attachments || attachments.length === 0)) return;
    shouldAutoScrollRef.current = true;
    handleSendPrompt(msg, attachments);
    setPromptText('');
  };

  const handleQueue = (text, attachments = []) => {
    const msg = text !== undefined ? text : promptText;
    if (!msg?.trim() && (!attachments || attachments.length === 0)) return;
    handleQueueMessage(msg, attachments);
    setPromptText('');
  };

  return (
    <div className="aw-app-shell font-sans">
      <ToastContainer />

      <Navbar
        targetTitle={snapshotData?.target ? snapshotData.target.split(' - ')[0] : 'AgentWatch'}
        workspaceName={appState.workspace_name}
        chatTitle={appState.active_conversation_title}
        isConnected={appState.connected}
        cdpStatus={appState.cdp}
        onRefreshAppState={fetchAppState}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenLogs={() => {
          setLogsOpen(true);
          fetchSystemLogs();
        }}
        onOpenTaskManager={() => setTaskManagerOpen(true)}
        onOpenRecovery={() => {
          setRecoveryOpen(true);
          fetchRecoveryItems();
        }}
        recoveryCount={recoveryItems.length}
        onOpenHistory={() => {
          setHistoryOpen(true);
        }}
        onOpenFiles={() => setActiveFileViewer({ cleanPath: '', openTree: true })}
        onOpenPortForwarding={() => setPortForwardingOpen(true)}
      />

      <main className="aw-main-viewport">
        <div
          className={`flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full overflow-hidden ${
            viewMode === 'chat' ? 'flex' : 'hidden'
          }`}
        >
          <ChatStream
            ref={chatScrollRef}
            chatMessages={chatMessages}
            isChatLoading={isChatLoading}
            hasMoreHistory={hasMoreHistory}
            isLoadingOlder={isLoadingOlder}
            onLoadOlder={loadOlderMessages}
            openItemIds={openItemIds}
            approvals={approvals}
            isScrolledUp={isScrolledUp}
            onToggleItem={toggleItem}
            onApprove={handleApproval}
            onRespondQuestion={handleRespondDirectQuestion}
            onOpenFile={handleOpenFile}
            onScroll={handleChatScroll}
            onScrollToBottom={scrollToBottom}
            messagesEndRef={messagesEndRef}
            onStop={handleStopAgent}
          />

          {((pendingInteraction && isInteractionMinimized) ||
            (pendingApproval && isApprovalMinimized)) && (
            <PendingInteractionBanner
              pendingInteraction={isInteractionMinimized ? pendingInteraction : null}
              pendingApproval={isApprovalMinimized ? pendingApproval : null}
              selectedOptions={selectedOptions}
              customResponse={customResponse}
              isSubmitting={isSubmitting}
              submitSuccess={submitSuccess}
              onToggleOption={handleToggleOption}
              onChangeCustomResponse={setCustomResponse}
              onSubmit={handleInteractionSubmit}
              onReopenInteraction={handleReopenInteraction}
              onCancelInteraction={handleCancelInteraction}
              onReopenApproval={handleReopenApproval}
              onApprove={handleApproval}
            />
          )}

          {queuedMessages.length > 0 && (
            <QueuedMessagesCard
              messages={queuedMessages}
              onSendNow={handleQueueSendNow}
              onDelete={handleQueueDelete}
              onEdit={handleQueueEdit}
              isActionPending={isQueueActionPending}
            />
          )}

          <PromptComposer
            promptText={promptText}
            onChangePrompt={setPromptText}
            onSend={handleSend}
            onQueue={handleQueue}
            isSending={isSendingPrompt}
            isWorking={isAgentWorking}
            appState={appState}
            onOpenModelModal={() => setActiveModal('model')}
            onOpenReviewChanges={() => setReviewChangesOpen(true)}
            onOpenGitGraph={() => setGitGraphOpen(true)}
            onOpenFile={handleOpenFile}
            recoveryCount={recoveryItems.length}
            onStop={handleStopAgent}
          />
        </div>

        {viewMode === 'screen' && (
          <ScreenViewport
            snapshotData={snapshotData}
            isSnapshotLoading={isSnapshotLoading}
            fitMode={fitMode}
            setFitMode={setFitMode}
            setLightboxOpen={setLightboxOpen}
          />
        )}
      </main>

      <AppDrawersAndModals
        logsOpen={logsOpen}
        setLogsOpen={setLogsOpen}
        systemLogs={systemLogs}
        isLogsLoading={isLogsLoading}
        fetchSystemLogs={fetchSystemLogs}
        taskManagerOpen={taskManagerOpen}
        setTaskManagerOpen={setTaskManagerOpen}
        recoveryOpen={recoveryOpen}
        setRecoveryOpen={setRecoveryOpen}
        recoveryItems={recoveryItems}
        diagnostics={diagnostics}
        isRecoveryLoading={isRecoveryLoading}
        fetchRecoveryItems={fetchRecoveryItems}
        handleReopenInteraction={handleReopenInteraction}
        setViewMode={setViewMode}
        historyOpen={historyOpen}
        setHistoryOpen={setHistoryOpen}
        historyChats={historyChats}
        isHistoryLoading={isHistoryLoading}
        onSwitchConversation={handleSwitchConversation}
        onStartNewConversation={handleStartNewConversation}
        reviewChangesOpen={reviewChangesOpen}
        setReviewChangesOpen={setReviewChangesOpen}
        gitGraphOpen={gitGraphOpen}
        setGitGraphOpen={setGitGraphOpen}
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        appState={appState}
        handleSetModel={handleSetModel}
        handleSetMode={handleSetMode}
        lightboxOpen={lightboxOpen}
        setLightboxOpen={setLightboxOpen}
        snapshotData={snapshotData}
        isInteractionMinimized={isInteractionMinimized}
        pendingInteraction={pendingInteraction}
        selectedOptions={selectedOptions}
        customResponse={customResponse}
        isSubmitting={isSubmitting}
        submitSuccess={submitSuccess}
        handleToggleOption={handleToggleOption}
        setCustomResponse={setCustomResponse}
        handleInteractionSubmit={handleInteractionSubmit}
        handleDismissInteraction={handleDismissInteraction}
        handleCancelInteraction={handleCancelInteraction}
        isApprovalMinimized={isApprovalMinimized}
        pendingApproval={pendingApproval}
        isApprovaling={isApprovaling}
        handleApproval={handleApproval}
        handleDismissApproval={handleDismissApproval}
        handleOpenFile={handleOpenFile}
        activeFileViewer={activeFileViewer}
        setActiveFileViewer={setActiveFileViewer}
        portForwardingOpen={portForwardingOpen}
        setPortForwardingOpen={setPortForwardingOpen}
      />
    </div>
  );
}
