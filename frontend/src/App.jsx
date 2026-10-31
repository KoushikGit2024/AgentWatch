import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import ChatStream from './components/chat/ChatStream';
import PendingInteractionBanner from './components/chat/PendingInteractionBanner';
import QueuedMessagesCard from './components/chat/QueuedMessagesCard';
import { PromptComposer } from './components/PromptComposer';
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
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineCategory, setTimelineCategory] = useState(null);
  const [timelineSearch, setTimelineSearch] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [taskManagerOpen, setTaskManagerOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [fileTreeOpen, setFileTreeOpen] = useState(false);
  const [reviewChangesOpen, setReviewChangesOpen] = useState(false);
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
    timelineEvents,
    isTimelineLoading,
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
    handleToggleOption,
    handleSetModel,
    handleSetMode,
    handleStopAgent,
    fetchTimelineEvents,
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

  const scrollToBottom = useCallback(() => {
    shouldAutoScrollRef.current = true;
    setIsScrolledUp(false);
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    if (shouldAutoScrollRef.current && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const isAgentWorking =
    chatMessages.length > 0 &&
    chatMessages[chatMessages.length - 1]?.role === 'agent' &&
    Boolean(chatMessages[chatMessages.length - 1]?.is_working);

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

  const filteredTimelineEvents = timelineEvents.filter(ev => {
    if (timelineCategory && (ev.category || ev.event_type) !== timelineCategory) return false;
    if (timelineSearch.trim()) {
      const q = timelineSearch.toLowerCase();
      return (
        (ev.summary || '').toLowerCase().includes(q) ||
        (ev.event_type || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="aw-app-shell font-sans">
      <ToastContainer />

      <Navbar
        targetTitle={snapshotData?.target ? snapshotData.target.split(' - ')[0] : 'AgentWatch'}
        workspaceName={appState.workspace_name}
        chatTitle={appState.active_conversation_title}
        isConnected={appState.connected}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenTimeline={() => {
          setTimelineOpen(true);
          fetchTimelineEvents();
        }}
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
          fetchHistoryChats();
        }}
        onOpenFiles={() => setFileTreeOpen(true)}
        onOpenPortForwarding={() => setPortForwardingOpen(true)}
      />

      <main className="aw-main-viewport">
        {viewMode === 'chat' ? (
          <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full overflow-hidden">
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
              onOpenFile={handleOpenFile}
              recoveryCount={recoveryItems.length}
              onStop={handleStopAgent}
            />
          </div>
        ) : (
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
        timelineOpen={timelineOpen}
        setTimelineOpen={setTimelineOpen}
        filteredTimelineEvents={filteredTimelineEvents}
        isTimelineLoading={isTimelineLoading}
        timelineCategory={timelineCategory}
        setTimelineCategory={setTimelineCategory}
        timelineSearch={timelineSearch}
        setTimelineSearch={setTimelineSearch}
        fetchTimelineEvents={fetchTimelineEvents}
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
        reviewChangesOpen={reviewChangesOpen}
        setReviewChangesOpen={setReviewChangesOpen}
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
        fileTreeOpen={fileTreeOpen}
        setFileTreeOpen={setFileTreeOpen}
        handleOpenFile={handleOpenFile}
        activeFileViewer={activeFileViewer}
        setActiveFileViewer={setActiveFileViewer}
        portForwardingOpen={portForwardingOpen}
        setPortForwardingOpen={setPortForwardingOpen}
      />
    </div>
  );
}
