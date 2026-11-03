import React, { useState, useEffect } from 'react';
import { Icon } from '../../constants/icons';
import { api } from '../../services/api';

function parseModelTier(rawName) {
  if (!rawName) return { name: '', tier: '' };
  const match = rawName.match(
    /^(.*?)\s*(?:\((Thinking|High|Medium|Low)\)|\b(Thinking|High|Medium|Low))\s*$/i
  );
  if (match) {
    return {
      name: match[1].trim(),
      tier: match[2] || match[3] || '',
    };
  }
  return { name: rawName, tier: '' };
}

function normalizeModel(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isModelActive(itemModel, currentModel) {
  if (!itemModel || !currentModel) return false;
  const itemNorm = normalizeModel(itemModel);
  const curNorm = normalizeModel(currentModel);

  if (itemNorm === curNorm) return true;

  const itemTier = parseModelTier(itemModel).tier.toLowerCase();
  const curTier = parseModelTier(currentModel).tier.toLowerCase();

  if (itemTier && curTier) {
    return itemNorm === curNorm;
  }

  if (!curTier && itemTier) {
    return itemNorm.startsWith(curNorm) && itemTier === 'low';
  }

  return itemNorm === curNorm;
}

export default function ModelModal({
  isOpen,
  onClose,
  currentModel,
  availableModels = [],
  onSelectModel,
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedModels, setScannedModels] = useState([]);

  // On-demand scanning: when modal opens, query IDE models via CDP if list only has 1 or 0 options
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchOnDemandModels = async () => {
      try {
        setIsScanning(true);
        const res = await api.scanAvailableModels();
        if (isMounted && res && res.success && Array.isArray(res.available_models) && res.available_models.length > 0) {
          setScannedModels(res.available_models);
        }
      } catch {
      } finally {
        if (isMounted) setIsScanning(false);
      }
    };

    fetchOnDemandModels();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Prefer scanned models if available, otherwise fall back to prop availableModels, then currentModel
  const candidateList =
    scannedModels.length > 0
      ? scannedModels
      : Array.isArray(availableModels) && availableModels.length > 0
        ? availableModels
        : currentModel
          ? [currentModel]
          : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#131518] border border-[#262A30] rounded-2xl shadow-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#22252A] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <div className="w-4 h-4">{Icon.cpu}</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#E8EAED]">Plan Models</h3>
                {isScanning && (
                  <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Scanning IDE models...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#747C87]">Synchronized live with Antigravity IDE</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#747C87] hover:text-[#E8EAED] hover:bg-[#1D2024] transition cursor-pointer"
          >
            <div className="w-4 h-4">{Icon.x}</div>
          </button>
        </div>

        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
          {candidateList.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#747C87]">
              Connecting to IDE to detect plan models…
            </div>
          ) : (
            candidateList.map(m => {
              const { name, tier } = parseModelTier(m);
              const isActive = isModelActive(m, currentModel);

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onSelectModel(m);
                    onClose();
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-between border ${
                    isActive
                      ? 'bg-blue-600/15 border-blue-500/40 text-blue-100 shadow-sm'
                      : 'bg-[#181A1E] border-[#22252A] hover:bg-[#202328] hover:border-[#30343A] text-[#C4C7C5]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="truncate text-xs font-semibold">{name}</span>
                    {tier && (
                      <span
                        className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border ${
                          isActive
                            ? 'bg-blue-500/25 border-blue-400/40 text-blue-200'
                            : 'bg-[#121316] border-[#2B2F36] text-[#8E929B]'
                        }`}
                      >
                        {tier}
                      </span>
                    )}
                  </div>

                  {isActive ? (
                    <div className="flex items-center gap-1.5 text-blue-400 shrink-0 ml-2">
                      <div className="w-3.5 h-3.5">{Icon.check}</div>
                      <span className="text-[10px] font-mono uppercase font-semibold tracking-wider">
                        Active
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#555A63] opacity-0 group-hover:opacity-100 transition-opacity">
                      Select
                    </span>
                  )}
                </button>
              );
            })
          )}

          {isScanning && candidateList.length <= 1 && (
            <div className="px-3 py-2 text-[11px] font-mono text-[#828c9e] flex items-center gap-2 justify-center">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              <span>Checking effort tiers and available models...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
