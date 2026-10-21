import React, { useState, useRef } from 'react';
import { Icon } from '../constants/icons';
import { api } from '../services/api';
import { toast } from '../services/toastService';
import AttachmentPreview from './chat/AttachmentPreview';

export function PromptComposer({
    promptText,
    onChangePrompt,
    onSend,
    isSending,
    isWorking = false,
    appState,
    onOpenModelModal,
    onOpenReviewChanges,
    onOpenLogs,
    onOpenRecovery,
    onToggleViewMode,
    viewMode,
    recoveryCount = 0,
    onStop
}) {
    const [attachments, setAttachments] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    const imageInputRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleUploadFiles = async (fileList) => {
        if (!fileList || fileList.length === 0) return;

        const filesArray = Array.from(fileList);
        if (attachments.length + filesArray.length > 8) {
            toast.warning('Maximum 8 attachments allowed per prompt', 'Upload Limit');
            return;
        }

        setIsUploading(true);
        try {
            const res = await api.uploadAttachments(filesArray);
            if (res && res.attachments) {
                setAttachments(prev => [...prev, ...res.attachments]);
                toast.success(`Attached ${res.attachments.length} file${res.attachments.length > 1 ? 's' : ''}`, 'Attachment Added');
            }
        } catch (err) {
            console.error('Failed to upload attachments:', err);
            toast.error(err.message || 'Failed to upload attachments', 'Upload Error');
        } finally {
            setIsUploading(false);
            if (imageInputRef.current) imageInputRef.current.value = '';
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = (index) => {
        setAttachments(prev => prev.filter((_, idx) => idx !== index));
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const filesToUpload = [];
        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile();
                if (file) filesToUpload.push(file);
            }
        }

        if (filesToUpload.length > 0) {
            e.preventDefault();
            handleUploadFiles(filesToUpload);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            handleUploadFiles(e.dataTransfer.files);
        }
    };

    const handleTriggerSend = () => {
        const hasText = Boolean(promptText && promptText.trim());
        const hasAttachments = attachments.length > 0;
        if (!hasText && !hasAttachments) return;
        if (isSending || isUploading) return;

        onSend(promptText, attachments);
        setAttachments([]);
    };

    const canSend = (Boolean(promptText && promptText.trim()) || attachments.length > 0) && !isSending && !isUploading;

    return (
        <div className="p-3 md:p-4 bg-zinc-900/90 border-t border-zinc-800 shrink-0 pb-safe select-none">
            <div className="max-w-3xl mx-auto w-full space-y-2">

                {/* Antigravity Control Row (Files, Terminal, Screen, Recovery & Review Changes) */}
                <div className="flex items-center justify-between px-1 text-xs pt-0.5">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onOpenReviewChanges}
                            title="Inspect modified workspace files"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.file}</div>
                        </button>
                        <button
                            type="button"
                            onClick={onOpenLogs}
                            title="Terminal & System Logs"
                            className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.terminal}</div>
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        </button>
                        <button
                            type="button"
                            onClick={onToggleViewMode}
                            title="Toggle Workspace Viewport"
                            className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.screen}</div>
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
                        </button>
                        <button
                            type="button"
                            onClick={onOpenRecovery}
                            title="Recovery Center & Safeguards"
                            className="relative p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition active:scale-95 cursor-pointer"
                        >
                            <div className="w-4 h-4">{Icon.shield}</div>
                            {recoveryCount > 0 && (
                                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            )}
                        </button>
                    </div>

                    {/* Review Changes Pill Button */}
                    <button
                        type="button"
                        onClick={onOpenReviewChanges}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border border-zinc-750/90 text-xs font-medium transition active:scale-95 shadow-sm cursor-pointer"
                    >
                        <div className="w-3.5 h-3.5 text-zinc-400">{Icon.file}</div>
                        <span>Review Changes</span>
                    </button>
                </div>

                {/* Rounded Composer Card with Drag & Drop */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`rounded-2xl bg-zinc-950 border p-3 shadow-lg transition relative ${
                        isDragging
                            ? 'border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/30'
                            : 'border-zinc-800 focus-within:border-zinc-750'
                    }`}
                >
                    {/* Drag & drop overlay indicator */}
                    {isDragging && (
                        <div className="absolute inset-0 z-10 rounded-2xl bg-blue-950/80 backdrop-blur-xs flex items-center justify-center text-blue-300 font-medium text-xs pointer-events-none gap-2">
                            <div className="w-4 h-4">{Icon.paperclip}</div>
                            <span>Drop images or files here to attach</span>
                        </div>
                    )}

                    {/* Attachment Chips / Thumbnails Strip */}
                    <AttachmentPreview
                        attachments={attachments}
                        onRemove={handleRemoveAttachment}
                        onPreviewImage={setPreviewImage}
                    />

                    {/* Hidden Native File Inputs */}
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleUploadFiles(e.target.files)}
                        className="hidden"
                    />
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={(e) => handleUploadFiles(e.target.files)}
                        className="hidden"
                    />

                    {/* Textarea with Clipboard Paste support */}
                    <textarea
                        value={promptText}
                        onChange={e => onChangePrompt(e.target.value)}
                        onPaste={handlePaste}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleTriggerSend();
                            }
                        }}
                        placeholder="Ask anything, attach images or files, @ mention, / actions…"
                        rows={2}
                        className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none outline-none max-h-36 leading-relaxed select-text"
                    />

                    {/* Bottom controls row inside composer */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Model Selector Pill */}
                            <button
                                type="button"
                                onClick={onOpenModelModal}
                                title={appState?.model ? `Active Model: ${appState.model}` : 'Detecting active plan model…'}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 transition active:scale-95 cursor-pointer max-w-[200px]"
                            >
                                <div className="w-3.5 h-3.5 text-blue-400 shrink-0">{Icon.sparkles}</div>
                                <span className="truncate text-xs font-medium">
                                    {appState?.model || 'Detecting model…'}
                                </span>
                                <div className="w-3 h-3 text-zinc-500 shrink-0">{Icon.chevronDown}</div>
                            </button>

                            <div className="h-4 w-px bg-zinc-800 mx-0.5" />

                            {/* Attach Image Button */}
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={isUploading}
                                title="Attach Image (PNG, JPG, WEBP)"
                                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition active:scale-95 cursor-pointer disabled:opacity-40"
                            >
                                <div className="w-4 h-4 text-emerald-400">{Icon.image}</div>
                            </button>

                            {/* Attach File Button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                title="Attach File (Code, Config, Logs, Docs)"
                                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition active:scale-95 cursor-pointer disabled:opacity-40"
                            >
                                <div className="w-4 h-4 text-blue-400">{Icon.paperclip}</div>
                            </button>

                            {/* Uploading Spinner */}
                            {isUploading && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono">
                                    <svg className="w-3 h-3 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                    <span>Uploading…</span>
                                </span>
                            )}
                        </div>

                        {/* Dynamic Send / Stop Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {isWorking ? (
                                <button
                                    type="button"
                                    onClick={onStop}
                                    title="Stop agent run (Ctrl+D)"
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-900/40 active:scale-95 transition cursor-pointer"
                                >
                                    <div className="w-3.5 h-3.5">{Icon.stop}</div>
                                    <span>Stop</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={!canSend}
                                    onClick={handleTriggerSend}
                                    title="Send prompt (Enter)"
                                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition active:scale-95 shadow-md shadow-blue-900/40 cursor-pointer"
                                >
                                    <div className="w-4 h-4">{Icon.send}</div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lightbox Image Preview Modal */}
            {previewImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/80 hover:bg-zinc-800 text-white transition"
                        >
                            <div className="w-4 h-4">{Icon.x}</div>
                        </button>
                        <img
                            src={previewImage}
                            alt="Preview Attachment"
                            className="max-h-[85vh] max-w-full rounded-xl object-contain mx-auto"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
