import React from 'react';
import { ActivityTimelineDrawer } from './ActivityTimelineDrawer';
import { SystemLogsDrawer } from './SystemLogsDrawer';
import { TaskManagerDrawer } from './TaskManagerDrawer';
import { RecoveryCenterModal } from './RecoveryCenterModal';
import { HistoryDrawer } from './HistoryDrawer';
import { ReviewChangesModal } from './ReviewChangesModal';
import ModelModal from './modals/ModelModal';
import ModeModal from './modals/ModeModal';
import LightboxModal from './modals/LightboxModal';
import InteractionModal from './modals/InteractionModal';
import ApprovalModal from './modals/ApprovalModal';
import FileViewerModal from './modals/FileViewerModal';
import PortForwardingModal from './modals/PortForwardingModal';
import FileTreeDrawer from './FileTreeDrawer';
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

  fileTreeOpen,
  setFileTreeOpen,
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
        chats={historyChats}
        isLoading={isHistoryLoading}
        onSelectChat={title => {
          setHistoryOpen(false);
          toast.info(`Selected conversation: ${title}`, 'History');
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

      <PortForwardingModal
        isOpen={portForwardingOpen}
        onClose={() => setPortForwardingOpen(false)}
      />
    </>
  );
}
