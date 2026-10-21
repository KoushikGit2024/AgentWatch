import React, { useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';

export function RecoveryCenterModal({
    isOpen,
    onClose,
    recoveryItems = [],
    diagnostics = null,
    isLoading = false,
    onRefresh,
    onReconcileAction,
    onOpenInteraction
}) {
    const [activeTab, setActiveTab] = useState('recovery'); // 'recovery' | 'diagnostics'
    const [selectedItem, setSelectedItem] = useState(null);
    const [reconcileNotes, setReconcileNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleConfirmReconciliation = async () => {
        if (!selectedItem || isSubmitting) return;
        setIsSubmitting(true);
        try {
            await onReconcileAction({
                scope: selectedItem.context.scope,
                idempotency_key: selectedItem.context.idempotency_key,
                resolution_notes: reconcileNotes || 'Manually verified by user from Recovery Center'
            });
            setSelectedItem(null);
            setReconcileNotes('');
            onRefresh();
        } catch (e) {
            alert('Reconciliation failed: ' + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
            <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
                    <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </span>
                        <div>
                            <h2 className="text-sm font-semibold text-zinc-100">Recovery & Diagnostics</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <button
                                    onClick={() => setActiveTab('recovery')}
                                    className={`text-[11px] font-medium transition ${activeTab === 'recovery' ? 'text-amber-400 border-b border-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    Action Items ({recoveryItems.length})
                                </button>
                                <span className="text-zinc-700">·</span>
                                <button
                                    onClick={() => setActiveTab('diagnostics')}
                                    className={`text-[11px] font-medium transition ${activeTab === 'diagnostics' ? 'text-amber-400 border-b border-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    System Diagnostics
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <line x1={18} y1={6} x2={6} y2={18} />
                            <line x1={6} y1={6} x2={18} y2={18} />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeTab === 'diagnostics' ? (
                        diagnostics ? (
                            <div className="space-y-3 text-xs">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 uppercase font-semibold">FastAPI Backend</div>
                                        <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            Live & Healthy
                                        </div>
                                    </div>
                                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 uppercase font-semibold">MongoDB Database</div>
                                        <div className={`text-sm font-semibold mt-1 flex items-center gap-1.5 ${diagnostics.mongodb_ready ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            <span className={`w-2 h-2 rounded-full ${diagnostics.mongodb_ready ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            {diagnostics.mongodb_ready ? 'Connected' : 'Disconnected'}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 mt-0.5">{diagnostics.mongodb_database} (v{diagnostics.mongodb_version || 'unknown'})</div>
                                    </div>
                                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 uppercase font-semibold">Antigravity CDP (Port {diagnostics.cdp_port || 9000})</div>
                                        <div className={`text-sm font-semibold mt-1 flex items-center gap-1.5 ${diagnostics.cdp_connected ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            <span className={`w-2 h-2 rounded-full ${diagnostics.cdp_connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            {diagnostics.cdp_connected ? 'Active & Paired' : 'Standby / Offline'}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 mt-0.5 truncate" title={diagnostics.cdp_target || ''}>
                                            Target: {diagnostics.cdp_target || 'None'}
                                        </div>
                                    </div>
                                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                        <div className="text-[10px] text-zinc-500 uppercase font-semibold">In-Progress / Unknown</div>
                                        <div className="text-sm font-semibold text-zinc-200 mt-1">
                                            {diagnostics.in_progress_operations_count} / {diagnostics.outcome_unknown_count}
                                        </div>
                                        <div className="text-[10px] text-zinc-500 mt-0.5">Pending questions: {diagnostics.pending_interactions_count}</div>
                                    </div>
                                </div>
                                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 space-y-1 text-[11px] text-zinc-400">
                                    <div><strong className="text-zinc-300">Last Observation:</strong> {diagnostics.last_successful_observation ? new Date(diagnostics.last_successful_observation).toLocaleTimeString() : 'None recorded'}</div>
                                    <div><strong className="text-zinc-300">Last Ingested Event:</strong> {diagnostics.last_event_ingestion ? new Date(diagnostics.last_event_ingestion).toLocaleTimeString() : 'None recorded'}</div>
                                    <div><strong className="text-zinc-300">Reconnect Attempts:</strong> {diagnostics.reconnection_attempts}</div>
                                    {diagnostics.last_error && (
                                        <div className="text-rose-400"><strong className="text-rose-300">Last Error:</strong> {diagnostics.last_error}</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-xs text-zinc-500">Loading system diagnostics...</div>
                        )
                    ) : isLoading ? (
                        <div className="p-8 text-center text-xs text-zinc-500">Checking system diagnostics...</div>
                    ) : recoveryItems.length === 0 ? (
                        <div className="p-8 text-center space-y-2">
                            <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                                <Check className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h3 className="text-xs font-semibold text-zinc-200">System Healthy & Consistent</h3>
                            <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                                No crashed idempotency keys, unresolved requests, or CDP connection drops detected.
                            </p>
                        </div>
                    ) : (
                        recoveryItems.map((item) => (
                            <div
                                key={item.id}
                                className={`p-3.5 rounded-lg border transition ${
                                    item.severity === 'critical'
                                        ? 'bg-rose-950/20 border-rose-800/60'
                                        : 'bg-amber-950/20 border-amber-800/60'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                                item.severity === 'critical' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                                            }`}>
                                                {item.severity}
                                            </span>
                                            <h4 className="text-xs font-semibold text-zinc-100">{item.title}</h4>
                                        </div>
                                        <p className="text-[11px] text-zinc-300 leading-relaxed">{item.description}</p>
                                    </div>
                                </div>

                                {/* Truthful Evidence Matrix */}
                                <div className="mt-2.5 pt-2 border-t border-zinc-800/80 text-[11px] space-y-1.5">
                                    <div className="grid grid-cols-1 gap-1 text-zinc-400">
                                        <div><strong className="text-zinc-300">What happened:</strong> {item.what_happened}</div>
                                        <div><strong className="text-zinc-300">What is known:</strong> {item.what_is_known}</div>
                                        <div><strong className="text-amber-400/90">What is unknown:</strong> {item.what_is_unknown}</div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex items-center justify-between pt-2">
                                        <span className={`text-[10px] font-medium ${item.is_retry_safe ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {item.is_retry_safe ? (
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                    <span>Safe to recheck/open</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-amber-400">
                                                    <AlertTriangle className="w-3.5 h-3.5" />
                                                    <span>Automatic replay prohibited</span>
                                                </span>
                                            )}
                                        </span>
                                        {item.action_type === 'open_interaction' && (
                                            <button
                                                type="button"
                                                onClick={() => { onClose(); onOpenInteraction(); }}
                                                className="px-2.5 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition"
                                            >
                                                Answer Question
                                            </button>
                                        )}
                                        {item.action_type === 'recheck_connection' && (
                                            <button
                                                type="button"
                                                onClick={onRefresh}
                                                className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
                                            >
                                                Recheck Port 9000
                                            </button>
                                        )}
                                        {item.action_type === 'reconcile_manual' && (
                                            <button
                                                type="button"
                                                onClick={() => setSelectedItem(item)}
                                                className="px-2.5 py-1 text-xs font-medium rounded bg-amber-600 hover:bg-amber-500 text-white transition"
                                            >
                                                Resolve Uncertainty
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Manual Reconciliation Modal Overlay */}
                {selectedItem && (
                    <div className="p-4 border-t border-zinc-800 bg-zinc-950 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-zinc-200">Record User Reconciliation</h4>
                            <button onClick={() => setSelectedItem(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Cancel</button>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                            Confirm that you checked the desktop IDE and verified the actual state of operation <code className="text-zinc-200 font-mono">{selectedItem.context.idempotency_key}</code>.
                        </p>
                        <input
                            type="text"
                            value={reconcileNotes}
                            onChange={(e) => setReconcileNotes(e.target.value)}
                            placeholder="Resolution notes (e.g. Prompt already completed in IDE)"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-700"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedItem(null)}
                                className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={handleConfirmReconciliation}
                                className="px-3 py-1 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50"
                            >
                                {isSubmitting ? 'Recording...' : 'Audit Reconciliation'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
