import React from 'react';
import { Icon } from '../../constants/icons';

export function ModelSelectorButton({ appState, onOpenModelModal }) {
  const isDepleted = appState?.quota_status === 'depleted';
  const isLow = appState?.quota_status === 'low';

  const tooltip =
    appState?.quota_tooltip ||
    (appState?.model
      ? `Active Model: ${appState.model}${
          isLow ? ' (Quota Running Low)' : isDepleted ? ' (Quota Limit Reached)' : ''
        }`
      : 'Select Plan Model');

  return (
    <button
      type="button"
      onClick={onOpenModelModal}
      title={tooltip}
      className={`aw-focus-ring group flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#17191C] hover:bg-[#1D2024] text-[#E8EAED] border transition cursor-pointer max-w-[160px] sm:max-w-[240px] ${
        isDepleted
          ? 'border-rose-500/60 bg-rose-950/20 text-rose-200'
          : isLow
            ? 'border-amber-500/60 bg-amber-950/20 text-amber-200'
            : 'border-[#30343A] hover:border-violet-500/30'
      }`}
    >
      <div
        className={`w-3.5 h-3.5 shrink-0 group-hover:scale-110 transition-transform ${
          isDepleted ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-violet-400'
        }`}
      >
        {isDepleted || isLow ? Icon.gauge : Icon.cpu}
      </div>
      <span className="truncate text-[11px] sm:text-xs font-medium">
        {appState?.model || 'Select model...'}
      </span>
      {isLow && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
      {isDepleted && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500" />}
      <div className="w-3 h-3 text-[#747C87] group-hover:text-[#A0A6AF] shrink-0 transition-colors">
        {Icon.chevronDown}
      </div>
    </button>
  );
}
