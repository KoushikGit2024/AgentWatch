import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import ChatStream from './components/chat/ChatStream';
import PendingInteractionBanner from './components/chat/PendingInteractionBanner';
import QueuedMessagesCard from './components/chat/QueuedMessagesCard';
import { PromptComposer } from './components/PromptComposer';
import { ActivityTimelineDrawer } from './components/ActivityTimelineDrawer';
import { SystemLogsDrawer } from './components/SystemLogsDrawer';
import { TaskManagerDrawer } from './components/TaskManagerDrawer';
import { RecoveryCenterModal } from './components/RecoveryCenterModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ReviewChangesModal } from './components/ReviewChangesModal';
import ModelModal from './components/modals/ModelModal';
import ModeModal from './components/modals/ModeModal';
import LightboxModal from './components/modals/LightboxModal';
import InteractionModal from './components/modals/InteractionModal';
import ApprovalModal from './components/modals/ApprovalModal';
import FileViewerModal from './components/modals/FileViewerModal';
import FileTreeDrawer from './components/FileTreeDrawer';
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

    const handleOpenFile = useCallback((rawPath, lineRange = {}) => {
        const parsed = parseFileLink(rawPath);
        if (lineRange.startLine != null) parsed.startLine = lineRange.startLine;
        if (lineRange.endLine != null) parsed.endLine = lineRange.endLine;

        if (parsed.startLine != null && parsed.endLine == null) {
            parsed.endLine = parsed.startLine;
        } else if (parsed.startLine != null && parsed.endLine != null && parsed.startLine > parsed.endLine) {
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
        const onCustomOpenFile = (e) => {
            if (e.detail?.path) handleOpenFile(e.detail.path, e.detail);
        };
        window.addEventListener('agentwatch:open-file', onCustomOpenFile);
        return () => window.removeEventListener('agentwatch:open-file', onCustomOpenFile);
    }, [handleOpenFile]);

    const {
        appState,
        snapshotData,
        chatMessages,
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
        fetchHistoryChats
    } = useAgentWatch({ isScreenActive: viewMode === 'screen' || lightboxOpen });

    const [promptText, setPromptText] = useState('');
    const [openItemIds, setOpenItemIds] = useState(new Set());
    const [isScrolledUp, setIsScrolledUp] = useState(false);
    const chatScrollRef = useRef(null);
    const messagesEndRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);

    const toggleItem = useCallback((itemId) => {
        setOpenItemIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    }, []);

    const handleChatScroll = useCallback((e) => {
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
            chatScrollRef.current.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, []);

    useEffect(() => {
        if (shouldAutoScrollRef.current && chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const isAgentWorking = chatMessages.length > 0 &&
        chatMessages[chatMessages.length - 1]?.role === 'agent' &&
        Boolean(chatMessages[chatMessages.length - 1]?.is_working);

    const {
        queuedMessages,
        isActionPending: isQueueActionPending,
        handleSendNow: handleQueueSendNow,
        handleDelete: handleQueueDelete,
        handleQueueMessage
    } = useQueuedMessages(isAgentWorking);

    const handleQueueEdit = async (item) => {
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
            return (ev.summary || '').toLowerCase().includes(q) || (ev.event_type || '').toLowerCase().includes(q);
        }
        return true;
    });

    return (
        <div className="aw-app-shell font-sans">
            <ToastContainer />

            <Navbar
                targetTitle={snapshotData?.target ? snapshotData.target.split(' - ')[0] : 'AgentWatch'}
                isConnected={appState.connected}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onOpenTimeline={() => { setTimelineOpen(true); fetchTimelineEvents(); }}
                onOpenLogs={() => { setLogsOpen(true); fetchSystemLogs(); }}
                onOpenTaskManager={() => setTaskManagerOpen(true)}
                onOpenRecovery={() => { setRecoveryOpen(true); fetchRecoveryItems(); }}
                recoveryCount={recoveryItems.length}
                onOpenHistory={() => { setHistoryOpen(true); fetchHistoryChats(); }}
                onOpenFiles={() => setFileTreeOpen(true)}
            />

            <main className="aw-main-viewport">
                {viewMode === 'chat' ? (
                    <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full max-w-full overflow-hidden">
                        <ChatStream
                            ref={chatScrollRef}
                            chatMessages={chatMessages}
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

                        {((pendingInteraction && isInteractionMinimized) || (pendingApproval && isApprovalMinimized)) && (
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
                    <div className="flex-1 flex flex-col min-h-0 bg-[#101113] select-none">
                        <div className="px-3 sm:px-4 py-2 border-b border-[#30343A] bg-[#17191C] flex items-center justify-between gap-2 shrink-0">
                            <div className="flex items-center gap-2 text-xs text-[#A0A6AF] min-w-0">
                                <span className="font-semibold text-[#E8EAED] truncate">Antigravity Workspace Viewport</span>
                                <span>·</span>
                                <span className="text-[#79B89A] font-mono shrink-0">Port 9000</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setFitMode(f => (f === 'fit' ? 'full' : 'fit'))}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] text-[#E8EAED] transition cursor-pointer"
                                >
                                    <div className="w-3.5 h-3.5">{Icon.search}</div>
                                    <span>{fitMode === 'fit' ? '100%' : 'Fit'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLightboxOpen(true)}
                                    className="p-1.5 rounded bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] text-[#E8EAED] transition cursor-pointer"
                                    title="Open Fullscreen"
                                >
                                    <div className="w-4 h-4">{Icon.maximize}</div>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center min-h-0">
                            {snapshotData?.screenshot ? (
                                <img
                                    src={snapshotData.screenshot}
                                    alt="Antigravity IDE Viewport"
                                    onClick={() => setLightboxOpen(true)}
                                    className={`cursor-zoom-in rounded-md border border-[#30343A] transition-all ${
                                        fitMode === 'fit' ? 'max-w-full max-h-[80dvh] object-contain' : 'min-w-[1280px] h-auto'
                                    }`}
                                />
                            ) : (
                                <div className="text-center p-8 space-y-2 text-[#747C87]">
                                    <div className="w-10 h-10 rounded-md bg-[#17191C] border border-[#30343A] flex items-center justify-center mx-auto text-[#A0A6AF] mb-2">
                                        <div className="w-5 h-5">{Icon.screen}</div>
                                    </div>
                                    <p className="text-sm font-medium text-[#E8EAED]">Antigravity CDP Viewport</p>
                                    <p className="text-xs">No active window screenshot captured yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            <ActivityTimelineDrawer
                isOpen={timelineOpen}
                onClose={() => setTimelineOpen(false)}
                events={filteredTimelineEvents}
                isLoading={isTimelineLoading}
                activeCategory={timelineCategory}
                onSelectCategory={setTimelineCategory}
                searchQuery={timelineSearch}
                onChangeSearch={setTimelineSearch}
                onRefresh={fetchTimelineEvents}
            />

            <SystemLogsDrawer isOpen={logsOpen} onClose={() => setLogsOpen(false)} logs={systemLogs} isLoading={isLogsLoading} onRefresh={fetchSystemLogs} />
            <TaskManagerDrawer isOpen={taskManagerOpen} onClose={() => setTaskManagerOpen(false)} />

            <RecoveryCenterModal
                isOpen={recoveryOpen}
                onClose={() => setRecoveryOpen(false)}
                recoveryItems={recoveryItems}
                diagnostics={diagnostics}
                isLoading={isRecoveryLoading}
                onRefresh={fetchRecoveryItems}
                onOpenInteraction={() => { setRecoveryOpen(false); setViewMode('chat'); handleReopenInteraction(); }}
            />

            <HistoryDrawer
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                chats={historyChats}
                isLoading={isHistoryLoading}
                onSelectChat={(title) => { setHistoryOpen(false); toast.info(`Selected conversation: ${title}`, 'History'); }}
            />

            <ReviewChangesModal isOpen={reviewChangesOpen} onClose={() => setReviewChangesOpen(false)} />

            <ModelModal
                isOpen={activeModal === 'model'}
                onClose={() => setActiveModal(null)}
                currentModel={appState.model}
                availableModels={appState.available_models}
                onSelectModel={(m) => { handleSetModel(m); setActiveModal(null); }}
            />

            <ModeModal
                isOpen={activeModal === 'mode'}
                onClose={() => setActiveModal(null)}
                currentMode={appState.mode}
                availableModes={appState.available_modes}
                onSelectMode={(m) => { handleSetMode(m); setActiveModal(null); }}
            />

            <LightboxModal isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} screenshotUrl={snapshotData?.screenshot} />

            <InteractionModal
                interaction={isInteractionMinimized ? null : pendingInteraction}
                selectedOptions={selectedOptions}
                customResponse={customResponse}
                isSubmitting={isSubmitting}
                submitSuccess={submitSuccess}
                onToggleOption={handleToggleOption}
                onChangeCustomResponse={setCustomResponse}
                onSubmit={handleInteractionSubmit}
                onDismiss={handleDismissInteraction}
                onCancel={handleCancelInteraction}
            />

            <ApprovalModal
                approval={isApprovalMinimized ? null : pendingApproval}
                isSubmitting={isApprovaling}
                onDecide={handleApproval}
                onDismiss={handleDismissApproval}
            />

            <FileTreeDrawer
                isOpen={fileTreeOpen}
                onClose={() => setFileTreeOpen(false)}
                onOpenFile={handleOpenFile}
            />

            <FileViewerModal
                targetFile={activeFileViewer}
                onClose={() => setActiveFileViewer(null)}
                onToggleTreeDrawer={() => setFileTreeOpen(prev => !prev)}
            />
        </div>
    );
}
