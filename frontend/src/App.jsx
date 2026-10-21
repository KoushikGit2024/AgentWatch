import React, { useState, useRef, useEffect } from 'react';
import Navbar from './components/Navbar';
import ChatStream from './components/chat/ChatStream';
import PendingInteractionBanner from './components/chat/PendingInteractionBanner';
import { PromptComposer } from './components/PromptComposer';
import { ActivityTimelineDrawer } from './components/ActivityTimelineDrawer';
import { SystemLogsDrawer } from './components/SystemLogsDrawer';
import { RecoveryCenterModal } from './components/RecoveryCenterModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ReviewChangesModal } from './components/ReviewChangesModal';
import ModelModal from './components/modals/ModelModal';
import LightboxModal from './components/modals/LightboxModal';
import { useAgentWatch } from './hooks/useAgentWatch';
import { Icon } from './constants/icons';

export default function App() {
    // Custom Hook for State & Backend Sync
    const {
        appState,
        snapshotData,
        chatMessages,
        pendingInteraction,
        selectedOptions,
        customResponse,
        isSubmitting,
        submitSuccess,
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
        setCustomResponse,
        handleApproval,
        handleSendPrompt,
        handleInteractionSubmit,
        handleToggleOption,
        handleSetModel,
        handleStopAgent,
        fetchTimelineEvents,
        fetchSystemLogs,
        fetchRecoveryItems,
        fetchHistoryChats
    } = useAgentWatch();

    // UI View & Drawer State
    const [viewMode, setViewMode] = useState('chat');
    const [fitMode, setFitMode] = useState('fit');
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null); // 'mode' | 'model' | null
    const [timelineOpen, setTimelineOpen] = useState(false);
    const [logsOpen, setLogsOpen] = useState(false);
    const [recoveryOpen, setRecoveryOpen] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [reviewChangesOpen, setReviewChangesOpen] = useState(false);

    // Composer & Chat Stream State
    const [promptText, setPromptText] = useState('');
    const [openItemIds, setOpenItemIds] = useState(new Set());
    const [isScrolledUp, setIsScrolledUp] = useState(false);
    const chatScrollRef = useRef(null);
    const messagesEndRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);

    const toggleItem = (itemId) => {
        setOpenItemIds(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const handleChatScroll = (e) => {
        const el = e.currentTarget;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const isNearBottom = distanceFromBottom < 90;
        shouldAutoScrollRef.current = isNearBottom;
        setIsScrolledUp(!isNearBottom);
    };

    const scrollToBottom = () => {
        shouldAutoScrollRef.current = true;
        setIsScrolledUp(false);
        if (chatScrollRef.current) {
            chatScrollRef.current.scrollTo({
                top: chatScrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        if (shouldAutoScrollRef.current && chatScrollRef.current) {
            chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleSend = () => {
        if (!promptText.trim()) return;
        handleSendPrompt(promptText);
        setPromptText('');
    };

    return (
        <div className="flex flex-col h-[100dvh] w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
            {/* ─── Top Navigation Bar ────────────────────────────────────────── */}
            <Navbar
                targetTitle={snapshotData?.target ? snapshotData.target.split(' - ')[0] : 'AgentWatch'}
                isConnected={appState.connected}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onOpenTimeline={() => { setTimelineOpen(true); fetchTimelineEvents(); }}
                onOpenLogs={() => { setLogsOpen(true); fetchSystemLogs(); }}
                onOpenRecovery={() => { setRecoveryOpen(true); fetchRecoveryItems(); }}
                recoveryCount={recoveryItems.length}
                onOpenHistory={() => { setHistoryOpen(true); fetchHistoryChats(); }}
                onNewChat={() => handleSendPrompt('Start a fresh conversation and review workspace')}
                onStop={handleStopAgent}
            />

            {/* ─── Main Content Viewport ─────────────────────────────────────── */}
            <main className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
                {viewMode === 'chat' ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Conversation Stream */}
                        <ChatStream
                            ref={chatScrollRef}
                            chatMessages={chatMessages}
                            openItemIds={openItemIds}
                            approvals={approvals}
                            isScrolledUp={isScrolledUp}
                            onToggleItem={toggleItem}
                            onApprove={handleApproval}
                            onScroll={handleChatScroll}
                            onScrollToBottom={scrollToBottom}
                            messagesEndRef={messagesEndRef}
                        />

                        {/* Interactive Agent Decision Banner */}
                        <PendingInteractionBanner
                            pendingInteraction={pendingInteraction}
                            selectedOptions={selectedOptions}
                            customResponse={customResponse}
                            isSubmitting={isSubmitting}
                            submitSuccess={submitSuccess}
                            onToggleOption={handleToggleOption}
                            onChangeCustomResponse={setCustomResponse}
                            onSubmit={handleInteractionSubmit}
                        />

                        {/* Bottom Prompt Composer */}
                        <PromptComposer
                            promptText={promptText}
                            onChangePrompt={setPromptText}
                            onSend={handleSend}
                            isSending={false}
                            appState={appState}
                            onOpenModelModal={() => setActiveModal('model')}
                            onOpenReviewChanges={() => setReviewChangesOpen(true)}
                            onOpenLogs={() => { setLogsOpen(true); fetchSystemLogs(); }}
                            onOpenRecovery={() => { setRecoveryOpen(true); fetchRecoveryItems(); }}
                            onToggleViewMode={() => setViewMode(v => (v === 'chat' ? 'screen' : 'chat'))}
                            viewMode={viewMode}
                            recoveryCount={recoveryItems.length}
                            onStop={handleStopAgent}
                        />
                    </div>
                ) : (
                    /* Mirrored IDE Viewport */
                    <div className="flex-1 flex flex-col min-h-0 bg-black/60 select-none">
                        <div className="px-4 py-2 border-b border-zinc-850 bg-zinc-900/80 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <span className="font-semibold text-zinc-200">Antigravity Workspace Viewport</span>
                                <span>·</span>
                                <span className="text-emerald-400 font-mono">Port 9000</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setFitMode(f => (f === 'fit' ? 'full' : 'fit'))}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                                >
                                    <div className="w-3.5 h-3.5">{Icon.search}</div>
                                    <span>{fitMode === 'fit' ? 'Zoom 100%' : 'Fit to Screen'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLightboxOpen(true)}
                                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                                    title="Open Fullscreen"
                                >
                                    <div className="w-4 h-4">{Icon.maximize}</div>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-0">
                            {snapshotData?.screenshot ? (
                                <img
                                    src={snapshotData.screenshot}
                                    alt="Antigravity IDE Viewport"
                                    onClick={() => setLightboxOpen(true)}
                                    className={`cursor-zoom-in rounded-xl border border-zinc-800 shadow-2xl transition-all ${
                                        fitMode === 'fit' ? 'max-w-full max-h-[80vh] object-contain' : 'min-w-[1400px] h-auto'
                                    }`}
                                />
                            ) : (
                                <div className="text-center p-8 space-y-2 text-zinc-500">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center mx-auto text-zinc-600 mb-2">
                                        <div className="w-6 h-6">{Icon.screen}</div>
                                    </div>
                                    <p className="text-sm font-medium text-zinc-300">Antigravity CDP Viewport</p>
                                    <p className="text-xs">No active window screenshot captured yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* ─── Drawers & Modals ──────────────────────────────────────────── */}
            <ActivityTimelineDrawer
                isOpen={timelineOpen}
                onClose={() => setTimelineOpen(false)}
                events={timelineEvents}
                isLoading={isTimelineLoading}
                onRefresh={fetchTimelineEvents}
            />

            <SystemLogsDrawer
                isOpen={logsOpen}
                onClose={() => setLogsOpen(false)}
                logs={systemLogs}
                isLoading={isLogsLoading}
                onRefresh={fetchSystemLogs}
            />

            <RecoveryCenterModal
                isOpen={recoveryOpen}
                onClose={() => setRecoveryOpen(false)}
                recoveryItems={recoveryItems}
                diagnostics={diagnostics}
                isLoading={isRecoveryLoading}
                onRefresh={fetchRecoveryItems}
                onOpenInteraction={() => { setRecoveryOpen(false); setViewMode('chat'); }}
            />

            <HistoryDrawer
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                chats={historyChats}
                isLoading={isHistoryLoading}
            />

            <ReviewChangesModal
                isOpen={reviewChangesOpen}
                onClose={() => setReviewChangesOpen(false)}
            />

            <ModelModal
                isOpen={activeModal === 'model'}
                onClose={() => setActiveModal(null)}
                currentModel={appState.model}
                availableModels={appState.available_models}
                onSelectModel={(m) => { handleSetModel(m); setActiveModal(null); }}
            />

            <LightboxModal
                isOpen={lightboxOpen}
                onClose={() => setLightboxOpen(false)}
                screenshotUrl={snapshotData?.screenshot}
            />
        </div>
    );
}
