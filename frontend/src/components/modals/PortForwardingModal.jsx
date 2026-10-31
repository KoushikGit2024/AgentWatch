import React, { useState } from 'react';
import { Icon } from '../../constants/icons';
import { useTailscalePorts } from '../../hooks/useTailscalePorts';

const PRESET_PORTS = [
  { port: 5173, label: 'Vite Dev' },
  { port: 3000, label: 'Next/React' },
  { port: 8080, label: 'Docs/Storybook' },
  { port: 5000, label: 'Flask/API' },
];

export default function PortForwardingModal({ isOpen, onClose }) {
  const {
    forwards,
    tailnetHost,
    isConnected,
    isLoading,
    isSubmitting,
    handleForwardPort,
    handleRemovePort,
  } = useTailscalePorts(isOpen);

  const [inputPort, setInputPort] = useState('');
  const [inputLabel, setInputLabel] = useState('');
  const [copiedPort, setCopiedPort] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const portNum = parseInt(inputPort, 10);
    if (!portNum || portNum < 1024 || portNum > 65535) return;

    try {
      await handleForwardPort(portNum, portNum, inputLabel.trim() || null);
      setInputPort('');
      setInputLabel('');
    } catch {
      // Handled via toast in hook
    }
  };

  const copyUrl = (url, port) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedPort(port);
    setTimeout(() => setCopiedPort(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#131518] border border-[#262A30] rounded-2xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#22252A] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <div className="w-4 h-4">{Icon.globe}</div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#E8EAED]">Tailscale Port Forwarding</h3>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Private Mesh Only</span>
                </span>
              </div>
              <p className="text-[11px] text-[#747C87] truncate">
                {tailnetHost ? `Serving on ${tailnetHost}` : 'Private device-to-device network'}
              </p>
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

        {/* Quick-Add Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5 bg-[#181A1E] border border-[#22252A] rounded-xl p-3">
          <div className="text-[11px] font-medium text-[#A0A6AF]">Forward a Local Dev Port</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1024"
              max="65535"
              placeholder="Port (e.g. 5173)"
              value={inputPort}
              onChange={(e) => setInputPort(e.target.value)}
              className="w-32 bg-[#121316] border border-[#2B2F36] focus:border-blue-500/50 rounded-lg px-2.5 py-1.5 text-xs text-[#E8EAED] font-mono outline-none"
            />
            <input
              type="text"
              placeholder="Label (e.g. Vite Dev)"
              value={inputLabel}
              onChange={(e) => setInputLabel(e.target.value)}
              className="flex-1 bg-[#121316] border border-[#2B2F36] focus:border-blue-500/50 rounded-lg px-2.5 py-1.5 text-xs text-[#E8EAED] outline-none"
            />
            <button
              type="submit"
              disabled={isSubmitting || !inputPort}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs transition cursor-pointer shrink-0 flex items-center gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <div className="w-3.5 h-3.5">{Icon.plus}</div>
              )}
              <span>Forward</span>
            </button>
          </div>

          {/* Preset Pills */}
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto">
            <span className="text-[10px] text-[#555A63] shrink-0">Presets:</span>
            {PRESET_PORTS.map((preset) => (
              <button
                key={preset.port}
                type="button"
                onClick={() => {
                  setInputPort(String(preset.port));
                  setInputLabel(preset.label);
                }}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#121316] hover:bg-[#202328] text-[#8E929B] hover:text-[#C4C7C5] border border-[#2B2F36] transition cursor-pointer shrink-0"
              >
                {preset.port} ({preset.label})
              </button>
            ))}
          </div>
        </form>

        {/* Active Tunnels List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A0A6AF]">
            <span>Active Tunnels ({forwards.length})</span>
            {isLoading && <span className="text-[10px] text-blue-400 font-mono">Syncing...</span>}
          </div>

          <div className="space-y-1.5 max-h-[36vh] overflow-y-auto pr-1">
            {forwards.length === 0 ? (
              <div className="p-5 text-center text-xs text-[#747C87] border border-dashed border-[#262A30] rounded-xl">
                No custom ports currently forwarded. Forward a port above to serve it privately on your Tailnet.
              </div>
            ) : (
              forwards.map((item) => (
                <div
                  key={item.external_port}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#181A1E] border border-[#22252A] hover:border-[#30343A] transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-[#E8EAED]">{item.label}</span>
                        {item.is_primary && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/15 border border-blue-500/30 text-blue-300">
                            Primary
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[#747C87]">
                          Local :{item.local_port || item.external_port}
                        </span>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-mono text-blue-400 hover:text-blue-300 hover:underline truncate block"
                      >
                        {item.url}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={() => copyUrl(item.url, item.external_port)}
                      title="Copy Private Tailnet URL"
                      className="p-1.5 rounded-lg text-[#747C87] hover:text-[#E8EAED] hover:bg-[#202328] transition cursor-pointer"
                    >
                      <div className="w-3.5 h-3.5">
                        {copiedPort === item.external_port ? Icon.check : Icon.copy}
                      </div>
                    </button>
                    {!item.is_primary && (
                      <button
                        type="button"
                        onClick={() => handleRemovePort(item.external_port)}
                        title="Stop Port Forwarding"
                        className="p-1.5 rounded-lg text-[#747C87] hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <div className="w-3.5 h-3.5">{Icon.trash}</div>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Security Invariant Footer */}
        <div className="text-[10px] text-[#555A63] border-t border-[#22252A] pt-2.5 flex items-center justify-between">
          <span>Funnel Disabled (Public internet exposure blocked)</span>
          <span className="font-mono text-[#747C87]">Private Mesh HTTPS</span>
        </div>
      </div>
    </div>
  );
}

