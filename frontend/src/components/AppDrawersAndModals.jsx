import React from 'react';
import { ActivityTimelineDrawer } from './drawers/ActivityTimelineDrawer';
import { SystemLogsDrawer } from './drawers/SystemLogsDrawer';
import { TaskManagerDrawer } from './drawers/tasks/TaskManagerDrawer';
import { RecoveryCenterModal } from './modals/RecoveryCenterModal';
import { HistoryDrawer } from './drawers/HistoryDrawer';
import { ReviewChangesModal } from './modals/ReviewChangesModal';
import ModelModal from './modals/ModelModal';
import ModeModal from './modals/ModeModal';
import LightboxModal from './modals/LightboxModal';
import InteractionModal from './modals/InteractionModal';
import ApprovalModal from './modals/ApprovalModal';
import FileViewerModal from './modals/fileViewer/FileViewerModal';
import PortForwardingModal from './modals/PortForwardingModal';
import { toast } from '../services/toastService';

export function AppDrawersAndModals({
  timelineOpen,
  setTimelineOpen,
  filteredTimelineEvents,
  isTimelineLoading,
  timelineCategory,
  setTimelineCategory,
  timelineSearch,
  setTimelineSearch,
  fetchTimelineEvents,

  logsOpen,
  setLogsOpen,
  systemLogs,
  isLogsLoading,
  fetchSystemLogs,

  taskManagerOpen,
  setTaskManagerOpen,

  recoveryOpen,
  setRecoveryOpen,
  recoveryItems,
  diagnostics,
  isRecoveryLoading,
  fetchRecoveryItems,
  handleReopenInteraction,
  setViewMode,

  historyOpen,
  setHistoryOpen,
  historyChats,
  isHistoryLoading,
  onSwitchConversation,
  onStartNewConversation,

  reviewChangesOpen,
  setReviewChangesOpen,

  activeModal,
  setActiveModal,
  appState,
  handleSetModel,
  handleSetMode,

  lightboxOpen,
  setLightboxOpen,
  snapshotData,

  isInteractionMinimized,
  pendingInteraction,
  selectedOptions,
  customResponse,
  isSubmitting,
  submitSuccess,
  handleToggleOption,
  setCustomResponse,
  handleInteractionSubmit,
  handleDismissInteraction,
  handleCancelInteraction,

  isApprovalMinimized,
  pendingApproval,
  isApprovaling,
  handleApproval,
  handleDismissApproval,

  handleOpenFile,

  activeFileViewer,
  setActiveFileViewer,
  portForwardingOpen,
  setPortForwardingOpen,
}) {
  return (
    <>
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

      <SystemLogsDrawer
        isOpen={logsOpen}
        onClose={() => setLogsOpen(false)}
        logs={systemLogs}
        isLoading={isLogsLoading}
        onRefresh={fetchSystemLogs}
        onOpenFile={handleOpenFile}
      />
      <TaskManagerDrawer isOpen={taskManagerOpen} onClose={() => setTaskManagerOpen(false)} />

      <RecoveryCenterModal
        isOpen={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
        recoveryItems={recoveryItems}
        diagnostics={diagnostics}
        isLoading={isRecoveryLoading}
        onRefresh={fetchRecoveryItems}
        onOpenInteraction={() => {
          setRecoveryOpen(false);
          setViewMode('chat');
          handleReopenInteraction();
        }}
      />

      <HistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        activeConversationId={appState.active_conversation_id}
        onSelectConversation={(cid, title) => {
          if (onSwitchConversation) {
            onSwitchConversation(cid, title);
          }
        }}
        onNewConversation={() => {
          if (onStartNewConversation) {
            onStartNewConversation();
          } else if (onSwitchConversation) {
            onSwitchConversation('', 'New Conversation');
          }
        }}
      />

      <ReviewChangesModal isOpen={reviewChangesOpen} onClose={() => setReviewChangesOpen(false)} />

      <ModelModal
        isOpen={activeModal === 'model'}
        onClose={() => setActiveModal(null)}
        currentModel={appState.model}
        availableModels={appState.available_models}
        onSelectModel={m => {
          handleSetModel(m);
          setActiveModal(null);
        }}
      />

      <ModeModal
        isOpen={activeModal === 'mode'}
        onClose={() => setActiveModal(null)}
        currentMode={appState.mode}
        availableModes={appState.available_modes}
        onSelectMode={m => {
          handleSetMode(m);
          setActiveModal(null);
        }}
      />

      <LightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        screenshotUrl={snapshotData?.screenshot}
      />

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

      <FileViewerModal
        targetFile={activeFileViewer}
        onClose={() => setActiveFileViewer(null)}
        conversationId={appState?.active_conversation_id}
      />

      <PortForwardingModal
        isOpen={portForwardingOpen}
        onClose={() => setPortForwardingOpen(false)}
      />
    </>
  );
}
