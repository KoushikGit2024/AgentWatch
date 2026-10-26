import React from 'react';
import { Icon } from '../../constants/icons';

export default function ModeModal({
  isOpen,
  onClose,
  currentMode,
  availableModes = [],
  onSelectMode,
}) {
  if (!isOpen) return null;

  const modes =
    Array.isArray(availableModes) && availableModes.length > 0
      ? availableModes
      : currentMode
        ? [currentMode]
        : ['Agent'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-zinc-900 border-t border-zinc-800 rounded-t-3xl p-4 pb-8 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Agent Mode</h3>
            <p className="text-[11px] text-zinc-400">Environment execution setting</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white cursor-pointer"
          >
            <div className="w-4 h-4">{Icon.x}</div>
          </button>
        </div>
        <div className="space-y-1">
          {modes.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onSelectMode(m)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                currentMode === m ? 'bg-blue-600 text-white' : 'hover:bg-zinc-800 text-zinc-200'
              }`}
            >
              <span>{m}</span>
              {currentMode === m && (
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-700 text-white">
                  Active
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
