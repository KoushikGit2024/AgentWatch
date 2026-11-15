import React, { lazy, Suspense } from 'react';
import LightboxModal from './modals/LightboxModal';
import InteractionModal from './modals/InteractionModal';
import ApprovalModal from './modals/ApprovalModal';
import { toast } from '../services/toastService';
import { api } from '../services/api';

// Code-split heavy secondary drawers and modal views with dynamic import()
const SystemLogsDrawer = lazy(() =>
  import('./drawers/SystemLogsDrawer').then(m => ({ default: m.SystemLogsDrawer }))
);
const TaskManagerDrawer = lazy(() =>
  import('./drawers/tasks/TaskManagerDrawer').then(m => ({ default: m.TaskManagerDrawer }))
);
const RecoveryCenterModal = lazy(() =>
  import('./modals/RecoveryCenterModal').then(m => ({ default: m.RecoveryCenterModal }))
);
const HistoryDrawer = lazy(() =>
  import('./drawers/HistoryDrawer').then(m => ({ default: m.HistoryDrawer }))
);
const ReviewChangesModal = lazy(() =>
  import('./modals/ReviewChangesModal').then(m => ({ default: m.ReviewChangesModal }))
);
const GitGraphModal = lazy(() => import('./modals/GitGraphModal'));
const ModelModal = lazy(() => import('./modals/ModelModal'));
const ModeModal = lazy(() => import('./modals/ModeModal'));
const FileViewerModal = lazy(() => import('./modals/fileViewer/FileViewerModal'));
const PortForwardingModal = lazy(() => import('./modals/PortForwardingModal'));

export function AppDrawersAndModals({
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

  gitGraphOpen,
  setGitGraphOpen,

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
      <Suspense fallback={null}>
        {logsOpen && (
          <SystemLogsDrawer
            isOpen={logsOpen}
            onClose={() => setLogsOpen(false)}
            logs={systemLogs}
            isLoading={isLogsLoading}
            onRefresh={fetchSystemLogs}
            onOpenFile={handleOpenFile}
          />
        )}

        {taskManagerOpen && (
          <TaskManagerDrawer isOpen={taskManagerOpen} onClose={() => setTaskManagerOpen(false)} />
        )}

        {recoveryOpen && (
          <RecoveryCenterModal
            isOpen={recoveryOpen}
            onClose={() => setRecoveryOpen(false)}
            recoveryItems={recoveryItems}
            diagnostics={diagnostics}
            isLoading={isRecoveryLoading}
            onRefresh={fetchRecoveryItems}
            onReconcileAction={api.reconcileAction}
            onOpenInteraction={() => {
              setRecoveryOpen(false);
              setViewMode('chat');
              handleReopenInteraction();
            }}
          />
        )}

        {historyOpen && (
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
        )}

        {reviewChangesOpen && (
          <ReviewChangesModal
            isOpen={reviewChangesOpen}
            onClose={() => setReviewChangesOpen(false)}
          />
        )}

        {gitGraphOpen && (
          <GitGraphModal isOpen={gitGraphOpen} onClose={() => setGitGraphOpen(false)} />
        )}

        {activeModal === 'model' && (
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
        )}

        {activeModal === 'mode' && (
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
        )}

        {Boolean(activeFileViewer) && (
          <FileViewerModal
            targetFile={activeFileViewer}
            onClose={() => setActiveFileViewer(null)}
            conversationId={appState?.active_conversation_id}
          />
        )}

        {portForwardingOpen && (
          <PortForwardingModal
            isOpen={portForwardingOpen}
            onClose={() => setPortForwardingOpen(false)}
          />
        )}
      </Suspense>

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
    </>
  );
}
