import React from 'react';
import { Icon } from '../constants/icons';

export function ScreenViewport({
  snapshotData,
  isSnapshotLoading,
  fitMode,
  setFitMode,
  setLightboxOpen,
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#101113] select-none">
      <div className="px-3 sm:px-4 py-2 border-b border-[#30343A] bg-[#17191C] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 text-xs text-[#A0A6AF] min-w-0">
          <span className="font-semibold text-[#E8EAED] truncate">
            Antigravity Workspace Viewport
          </span>
          <span>·</span>
          <span className="text-[#79B89A] font-mono shrink-0 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Port 9000
          </span>
          {isSnapshotLoading && (
            <span className="text-cyan-400 text-[11px] font-mono flex items-center gap-1 animate-pulse">
              <div className="w-3 h-3 animate-spin border border-cyan-400 border-t-transparent rounded-full" />
              Refreshing...
            </span>
          )}
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

      <div className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center min-h-0 relative">
        {snapshotData?.screenshot ? (
          <div className="relative flex items-center justify-center">
            <img
              src={snapshotData.screenshot}
              alt="Antigravity IDE Viewport"
              onClick={() => setLightboxOpen(true)}
              className={`cursor-zoom-in rounded-lg border border-[#30343A] shadow-2xl transition-all ${
                fitMode === 'fit'
                  ? 'max-w-full max-h-[80dvh] object-contain'
                  : 'min-w-[1280px] h-auto'
              }`}
            />
            {isSnapshotLoading && (
              <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/75 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono flex items-center gap-1.5 shadow-md backdrop-blur-xs">
                <div className="w-2.5 h-2.5 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Syncing frame</span>
              </div>
            )}
          </div>
        ) : isSnapshotLoading ? (
          <div className="text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400 shadow-lg shadow-cyan-950/20">
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white tracking-tight">
                Capturing Antigravity Viewport...
              </p>
              <p className="text-xs text-[#94A3B8]">
                Connecting to IDE Chrome DevTools Protocol at port 9000
              </p>
            </div>
          </div>
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
  );
}
