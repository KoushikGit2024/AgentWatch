import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '../constants/icons';
import { FileIcon } from '../constants/fileIcons';
import { api } from '../services/api';
import { toast } from '../services/toastService';
import AttachmentPreview, { formatFileSize } from './chat/AttachmentPreview';


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
    onOpenTaskManager,
    onToggleViewMode,
    onOpenFile,
    chatMessages = [],
    viewMode,
    recoveryCount = 0,
    onStop,
    onQueue
}) {
    const [attachments, setAttachments] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewItem, setPreviewItem] = useState(null);

    // Attached workbench popovers ('terminal' | 'artifacts' | null)
    const [activeAttachedTab, setActiveAttachedTab] = useState(null);
    const [artifactsList, setArtifactsList] = useState([]);
    const [isLoadingArtifacts, setIsLoadingArtifacts] = useState(false);
    const [ideTerminalTasks, setIdeTerminalTasks] = useState([]);
    const [isLoadingTerminal, setIsLoadingTerminal] = useState(false);

    const imageInputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Keyboard listener for Escape to close maximized lightbox or popovers
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (previewItem) setPreviewItem(null);
                if (activeAttachedTab) setActiveAttachedTab(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [previewItem, activeAttachedTab]);

    const handleToggleAttachedTab = async (tabName) => {
        if (activeAttachedTab === tabName) {
            // Just close the web tray popover; do not toggle/close the IDE workbench terminal
            setActiveAttachedTab(null);
            return;
        }
        setActiveAttachedTab(tabName);
        if (tabName === 'artifacts') {
            setIsLoadingArtifacts(true);
            try {
                const res = await api.getArtifacts();
                setArtifactsList(res?.artifacts || []);
            } catch (err) {
                toast.error(err.message || 'Could not load artifacts', 'Artifacts');
            } finally {
                setIsLoadingArtifacts(false);
            }
        } else if (tabName === 'terminal') {
            setIsLoadingTerminal(true);
            try {
                // Fetch current tasks first to check if IDE terminal is already open
                const tasksRes = await api.getTerminalTasks();
                if (tasksRes?.tasks && tasksRes.tasks.length > 0) {
                    setIdeTerminalTasks(tasksRes.tasks);
                } else {
                    // If not yet open, trigger IDE terminal toggle via CDP to open it
                    const toggleRes = await api.toggleTerminal();
                    if (toggleRes?.tasks && Array.isArray(toggleRes.tasks)) {
                        setIdeTerminalTasks(toggleRes.tasks);
                    }
                }
            } catch (err) {
                console.error('Terminal sync error:', err);
            } finally {
                setIsLoadingTerminal(false);
            }
        }
    };


    const handleKillIdeTerminalTask = async (taskIndex, tooltipId) => {
        try {
            await api.killTerminalTask(taskIndex, tooltipId);
            // Optimistically remove or update task, then refresh from IDE
            setIdeTerminalTasks(prev => prev.filter((_, idx) => idx !== taskIndex));
            setTimeout(async () => {
                try {
                    const refreshed = await api.getTerminalTasks();
                    if (refreshed?.tasks) setIdeTerminalTasks(refreshed.tasks);
                } catch {}
            }, 300);
        } catch (err) {
            toast.error(err.message || 'Could not terminate command in IDE', 'Terminal');
        }
    };



    const handleUploadFiles = async (fileList) => {
        if (!fileList || fileList.length === 0) return;

        const filesArray = Array.from(fileList);
        if (attachments.length + filesArray.length > 8) {
            toast.warning('Maximum 8 attachments allowed per prompt', 'Upload Limit');
            return;
        }

        // Instant optimistic preview generation
        const optimisticItems = filesArray.map((f, i) => {
            const isImg = f.type.startsWith('image/') || f.name.match(/\.(png|jpe?g|webp|gif|svg)$/i);
            return {
                id: `opt_${Date.now()}_${i}`,
                original_name: f.name,
                filename: f.name,
                size: f.size,
                is_image: isImg,
                previewUrl: isImg ? URL.createObjectURL(f) : null,
                isPending: true
            };
        });

        setAttachments(prev => [...prev, ...optimisticItems]);
        setIsUploading(true);

        try {
            const res = await api.uploadAttachments(filesArray);
            if (res && res.attachments) {
                // Replace pending items with confirmed server attachments
                const uploaded = res.attachments;
                setAttachments(prev => {
                    const nonPending = prev.filter(p => !optimisticItems.some(o => o.id === p.id));
                    return [...nonPending, ...uploaded];
                });
                toast.success(`Attached ${uploaded.length} file${uploaded.length > 1 ? 's' : ''}`, 'Attachment Uploaded');
            }
        } catch (err) {
            console.error('Failed to upload attachments:', err);
            // Revert optimistic items on failure
            setAttachments(prev => prev.filter(p => !optimisticItems.some(o => o.id === p.id)));
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
                if (file) {
                    let fileName = file.name;
                    if (!fileName || fileName === 'image.png' || fileName === 'blob') {
                        const now = new Date();
                        const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                        fileName = `Pasted_Image_${timeStr}.png`;
                    }
                    const renamed = new File([file], fileName, { type: file.type || 'image/png' });
                    filesToUpload.push(renamed);
                }
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
        const readyAttachments = attachments.filter(a => !a.isPending);
        if (!hasText && readyAttachments.length === 0) return;
        if (isSending || isUploading) return;

        onSend(promptText, readyAttachments);
        setAttachments([]);
    };

    const handleTriggerQueue = () => {
        const hasText = Boolean(promptText && promptText.trim());
        const readyAttachments = attachments.filter(a => !a.isPending);
        if (!hasText && readyAttachments.length === 0) return;
        if (isSending || isUploading) return;

        if (onQueue) {
            onQueue(promptText, readyAttachments);
        } else {
            onSend(promptText, readyAttachments);
        }
        setAttachments([]);
    };

    const readyAttachments = attachments.filter(a => !a.isPending);
    const canSend = (Boolean(promptText && promptText.trim()) || readyAttachments.length > 0) && !isSending && !isUploading;

    return (
        <div className="p-3 md:p-4 bg-zinc-900/90 border-t border-zinc-800 shrink-0 pb-safe select-none">
            <div className="max-w-3xl mx-auto w-full space-y-2">

                {/* Antigravity IDE Workbench Attached Control Bar */}
                <div className="outline-solid relative z-20 flex min-h-[1.8rem] justify-between items-center px-1.5 py-1 outline-1 outline-zinc-500/20 bg-zinc-950/80 rounded-lg select-none">
                    <div className="flex min-w-0 gap-x-2 overflow-hidden items-center">
                        <div className="flex-none">
                            <div className="rounded-md flex flex-row items-center gap-0.5">
                                {/* Changes Overview Tooltip Button */}
                                <div className="min-w-0 overflow-hidden">
                                    <div className="w-fit">
                                        <div
                                            data-tooltip-id="tooltip-changesOverview"
                                            onClick={onOpenReviewChanges}
                                            title="Changes Overview"
                                            className="rounded-md cursor-pointer p-1 hover:bg-zinc-700/30 text-zinc-400 hover:text-zinc-200 transition"
                                        >
                                            <div className="relative">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" className="opacity-80">
                                                    <path d="M330-250H630v-60H330v60Zm0-160H630v-60H330v60ZM252.31-100Q222-100 201-121t-21-51.31V-787.69Q180-818 201-839t51.31-21H570L780-650v477.69Q780-142 759-121t-51.31,21H252.31ZM540-620V-800H252.31q-4.62,0-8.46,3.85T240-787.69v615.38q0,4.62 3.85,8.46t8.46,3.85H707.69q4.62,0 8.46-3.85t3.85-8.46V-620H540ZM240-800v180V-800v180v447.69q0,4.62 0,8.46t0,3.85q0,0 0-3.85t0-8.46V-787.69q0-4.62 0-8.46t0-3.85Z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Terminal Tooltip Button */}
                                <div className="min-w-0 overflow-hidden">
                                    <div className="w-fit">
                                        <div
                                            data-tooltip-id="tooltip-terminal"
                                            onClick={() => handleToggleAttachedTab('terminal')}
                                            title="Terminal & Commands"
                                            className={`rounded-md cursor-pointer p-1 transition ${
                                                activeAttachedTab === 'terminal'
                                                    ? 'bg-zinc-800 text-white'
                                                    : 'hover:bg-zinc-700/30 text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            <div className="relative">
                                                <div className="absolute -bottom-0.5 -right-0.5 z-20 origin-center rounded-full bg-blue-500 scale-100 opacity-100 h-2 w-2 animate-pulse" />
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" className="opacity-80">
                                                    <path d="M172.31-180Q142-180 121-201t-21-51.31V-707.69Q100-738 121-759t51.31-21H787.69Q818-780 839-759t21,51.31v455.38Q860-222 839-201t-51.31,21H172.31Zm0-60H787.69q4.62,0 8.46-3.85t3.85-8.46V-640H160v387.69q0,4.62 3.85,8.46t8.46,3.85ZM300-294.23L258.23-336l103-104l-104-104L300-585.77L445.77-440L300-294.23ZM490-290v-60H710v60H490Z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Artifacts Tooltip Button */}
                                <div className="min-w-0 overflow-hidden">
                                    <div className="w-fit">
                                        <div
                                            data-tooltip-id="tooltip-artifacts"
                                            onClick={() => handleToggleAttachedTab('artifacts')}
                                            title="Artifacts"
                                            className={`rounded-md cursor-pointer p-1 transition ${
                                                activeAttachedTab === 'artifacts'
                                                    ? 'bg-zinc-800 text-white'
                                                    : 'hover:bg-zinc-700/30 text-zinc-400 hover:text-zinc-200'
                                            }`}
                                        >
                                            <div className="relative">
                                                {recoveryCount > 0 && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 z-20 origin-center rounded-full bg-amber-500 scale-100 opacity-100 h-2 w-2" />
                                                )}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" className="opacity-80">
                                                    <path d="M212.31-140Q182-140 161-161t-21-51.31V-747.69Q140-778 161-799t51.31-21H747.69Q778-820 799-799t21,51.31v535.38Q820-182 799-161t-51.31,21H212.31Zm0-60H747.69q5.39,0 8.85-3.46t3.46-8.85V-327.69H628.46q-26.15,38-64.96,59t-83.5,21t-83.5-21t-64.96-59H200v115.38q0,5.39 3.46,8.85t8.85,3.46ZM549-329.69q31-22 43-58H760v-360q0-5.39-3.46-8.85T747.69-760H212.31q-5.39,0-8.85,3.46T200-747.69v360H368q12,36 43,58t69,22t69-22ZM212.31-200q-5.39,0-8.85,0T200-200H331.54q26.15,0 64.96,0t83.5,0t83.5,0t64.96,0H760q0,0-3.46,0t-8.85,0H212.31Z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Browser Tooltip Button */}
                                {/* <div className="min-w-0 overflow-hidden">
                                    <div className="w-fit">
                                        <div
                                            data-tooltip-id="tooltip-browser"
                                            onClick={onToggleViewMode}
                                            title="Browser & Viewport"
                                            className="rounded-md cursor-pointer p-1 hover:bg-zinc-700/30 text-zinc-400 hover:text-zinc-200 transition"
                                        >
                                            <div className="relative">
                                                {viewMode === 'screen' && (
                                                    <div className="absolute -bottom-0.5 -right-0.5 z-20 origin-center rounded-full bg-blue-500 scale-100 opacity-100 h-2 w-2" />
                                                )}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" className="h-4 w-4 stroke-1 opacity-80">
                                                    <path d="M375.46-372.46Q418.62-329.31 480-329.31t104.54-43.15T627.69-477T584.54-581.54T480-624.69T375.46-581.54T332.31-477t43.15,104.54ZM480-255.46q11.85,0 23.08-1.19t22.08-3.81L438.46-110.77Q299-126.62 204.89-230.08t-94.11-246.8q0-38.84 7.42-75.37t22.27-69.82l147.62,255.8q28.6,49.87 79.35,80.34T480-255.46Zm0.09-443.07q-73.82,0-131.04,42.92T269.69-546.23L183-695.92q50.77-68.61 127.78-109.46t169.23-40.85q91.3,0 167.76,40.23T775.38-698.54H480.09Zm337.83,73.85q15.46,33.92 23.38,71.04t7.92,76.78q0,142.99-93.61,246.31T524.15-110.77L671.97-366.3q13.86-23.98 21.71-52.12T701.54-477q0-43.33-15.15-80.66t-41.85-67.03H817.92Z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div> */}
                            </div>
                        </div>
                    </div>

                    {/* Right Action: Review Changes Button matching IDE */}
                    <div className="flex flex-none items-center gap-1">
                        <div className="flex items-center">
                            <button
                                type="button"
                                onClick={onOpenReviewChanges}
                                className="mx-1 flex cursor-pointer items-center border border-zinc-700/60 justify-center gap-1 rounded-md bg-zinc-800/80 hover:bg-zinc-750 px-2 py-0.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor" className="h-3.5 w-3.5 opacity-70">
                                    <path d="M510-530h60v-80h80v-60H570v-80H510v80H430v60h80v80ZM430-370H650v-60H430v60ZM332.31-220Q302-220 281-241t-21-51.31V-827.69Q260-858 281-879t51.31-21H610L820-690v397.69Q820-262 799-241t-51.31,21H332.31Zm0-60H747.69q4.62,0 8.46-3.85t3.85-8.46V-660L580-840H332.31q-4.62,0-8.46,3.85T320-827.69v535.38q0,4.62 3.85,8.46t8.46,3.85Zm-160,220Q142-60 121-81t-21-51.31V-660h60v527.69q0,4.62 3.85,8.46t8.46,3.85H580v60H172.31ZM320-280q0,0 0-3.85t0-8.46V-827.69q0-4.62 0-8.46t0-3.85v180v367.69q0,4.62 0,8.46t0,3.85Z" />
                                </svg>
                                <span>Review Changes</span>
                            </button>
                        </div>
                    </div>

                    {/* Attached Popover Panel for Terminal & Artifacts */}
                    {activeAttachedTab && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 z-30 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/95 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
                            {/* Popover Header */}
                            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800/80 bg-zinc-900/60 text-xs">
                                <div className="flex items-center gap-2 font-medium text-zinc-300">
                                    {activeAttachedTab === 'terminal' ? (
                                        <>
                                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                            <span>Active Terminal & Executing Commands</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 -960 960 960" fill="currentColor" className="text-zinc-400">
                                                <path d="M212.31-140Q182-140 161-161t-21-51.31V-747.69Q140-778 161-799t51.31-21H747.69Q778-820 799-799t21,51.31v535.38Q820-182 799-161t-51.31,21H212.31Zm0-60H747.69q5.39,0 8.85-3.46t3.46-8.85V-327.69H628.46q-26.15,38-64.96,59t-83.5,21t-83.5-21t-64.96-59H200v115.38q0,5.39 3.46,8.85t8.85,3.46ZM549-329.69q31-22 43-58H760v-360q0-5.39-3.46-8.85T747.69-760H212.31q-5.39,0-8.85,3.46T200-747.69v360H368q12,36 43,58t69,22t69-22ZM212.31-200q-5.39,0-8.85,0T200-200H331.54q26.15,0 64.96,0t83.5,0t83.5,0t64.96,0H760q0,0-3.46,0t-8.85,0H212.31Z" />
                                            </svg>
                                            <span>Generated Artifacts & Media</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActiveAttachedTab(null)}
                                        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                                    >
                                        <div className="w-3.5 h-3.5">{Icon.x}</div>
                                    </button>
                                </div>
                            </div>

                            {/* Popover Content */}
                            <div className="max-h-64 overflow-y-auto p-2">
                                {activeAttachedTab === 'terminal' ? (
                                    isLoadingTerminal ? (
                                        <div className="flex items-center justify-center py-6 text-xs text-zinc-400 gap-2">
                                            <span className="w-3.5 h-3.5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                                            <span>Syncing terminal from IDE…</span>
                                        </div>
                                    ) : ideTerminalTasks.length > 0 ? (
                                        <div className="flex flex-col">
                                            {ideTerminalTasks.map((task, idx) => (
                                                <div
                                                    key={task.tooltip_id || idx}
                                                    className="flex select-none flex-row items-center justify-between gap-x-2 border-b border-zinc-800/60 last:border-b-0 p-1.5 px-2 hover:bg-zinc-900/60 transition"
                                                >
                                                    <div className="flex min-w-0 flex-1 items-center gap-x-2">
                                                        {task.is_running !== false ? (
                                                            <span className="loader min-h-3.5 min-w-3.5 max-w-3.5 max-h-3.5 shrink-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin inline-block" />
                                                        ) : (
                                                            <span className="min-h-3.5 min-w-3.5 max-w-3.5 max-h-3.5 shrink-0 rounded-full bg-emerald-500/80 inline-block" />
                                                        )}
                                                        <span className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm text-zinc-200">
                                                            {task.command || 'terminal command'}
                                                        </span>
                                                    </div>
                                                    <div
                                                        data-tooltip-id={task.tooltip_id || `terminal-expanded-content--${idx}`}
                                                        className="text-zinc-400 hover:text-zinc-100 flex items-center"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => handleKillIdeTerminalTask(task.index ?? idx, task.tooltip_id)}
                                                            title="Close / Stop Terminal Command in IDE"
                                                            className="p-1 rounded hover:bg-zinc-850 hover:text-rose-400 transition cursor-pointer"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 -960 960 960" fill="currentColor">
                                                                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-5 text-zinc-500 text-xs">
                                            No active or running terminal commands in IDE.
                                        </div>
                                    )
                                ) : (

                                    /* Artifacts Tab matching user's requested artifact chip style */
                                    isLoadingArtifacts ? (
                                        <div className="flex items-center justify-center py-6 text-xs text-zinc-400 gap-2">
                                            <span className="w-3 h-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                                            <span>Loading workspace artifacts…</span>
                                        </div>
                                    ) : artifactsList.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto">
                                            {artifactsList.map(art => (
                                                <button
                                                    key={art.id || art.path}
                                                    type="button"
                                                    onClick={() => {
                                                        if (onOpenFile) {
                                                            onOpenFile(art.path);
                                                            setActiveAttachedTab(null);
                                                        } else {
                                                            window.open(art.path, '_blank');
                                                        }
                                                    }}
                                                    className="select-none inline-flex items-center gap-1.5 rounded-md align-middle text-xs font-medium text-zinc-200 p-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/80 cursor-pointer transition active:scale-95 text-left"
                                                >
                                                    <FileIcon path={art.filename || art.path} className="w-4 h-4 shrink-0" />
                                                    <span className="inline-flex items-center gap-1 break-all leading-tight select-text text-left">
                                                        <span>{art.title || art.filename}</span>
                                                    </span>
                                                    {art.type && art.type !== 'markdown' && (
                                                        <span className="ml-1 text-[9px] uppercase px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                                                            {art.type}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}

                                        </div>
                                    ) : (
                                        <div className="text-center py-5 text-zinc-500 text-xs">
                                            No artifacts found in the active workspace brain.
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
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
                        <div className="absolute inset-0 z-10 rounded-2xl bg-blue-950/85 backdrop-blur-xs flex items-center justify-center text-blue-300 font-medium text-xs pointer-events-none gap-2">
                            <div className="w-4 h-4">{Icon.paperclip}</div>
                            <span>Drop images or files here to attach</span>
                        </div>
                    )}

                    {/* Attachment Chips / Thumbnails Strip */}
                    <AttachmentPreview
                        attachments={attachments}
                        onRemove={handleRemoveAttachment}
                        onPreviewImage={(att) => setPreviewItem(att)}
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
                                if (isWorking) {
                                    handleTriggerQueue();
                                } else {
                                    handleTriggerSend();
                                }
                            }
                        }}
                        placeholder="Ask anything, paste/attach images or files, @ mention, / actions…"
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

                            {/* Uploading Status Indicator */}
                            {isUploading && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono animate-in fade-in duration-150">
                                    <svg className="w-3 h-3 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                                    </svg>
                                    <span>Uploading…</span>
                                </span>
                            )}
                        </div>

                        {/* Dynamic Send / Stop / Queue Controls */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {isWorking ? (
                                <>
                                    <button
                                        type="button"
                                        disabled={!canSend}
                                        onClick={handleTriggerQueue}
                                        title="Queue follow-up message to run after agent finishes"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 border border-zinc-700/80 font-medium text-xs shadow-sm active:scale-95 transition cursor-pointer"
                                    >
                                        <div className="w-3.5 h-3.5 text-blue-400">{Icon.send}</div>
                                        <span>Queue</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onStop}
                                        title="Stop agent run (Ctrl+D)"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-md shadow-rose-900/40 active:scale-95 transition cursor-pointer"
                                    >
                                        <div className="w-3.5 h-3.5">{Icon.stop}</div>
                                        <span>Stop</span>
                                    </button>
                                </>
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

            {/* Maximized Lightbox Image Modal */}
            {previewItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
                    onClick={() => setPreviewItem(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[92vh] w-full overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Lightbox Header with details and controls */}
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-850 px-1 text-xs">
                            <div className="flex items-center gap-2 truncate">
                                <span className="font-mono text-zinc-200 font-medium truncate">
                                    {previewItem.original_name || previewItem.filename || 'Attached Image'}
                                </span>
                                {previewItem.size && (
                                    <span className="text-[10px] text-zinc-400 font-sans px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800">
                                        {formatFileSize(previewItem.size)}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {(previewItem.url || previewItem.previewUrl) && (
                                    <a
                                        href={previewItem.url || previewItem.previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open original in new tab"
                                        className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                                    >
                                        <div className="w-4 h-4">{Icon.maximize}</div>
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setPreviewItem(null)}
                                    title="Close preview (Esc)"
                                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                                >
                                    <div className="w-4 h-4">{Icon.x}</div>
                                </button>
                            </div>
                        </div>

                        {/* Image Maximized Display */}
                        <div className="flex-1 flex items-center justify-center overflow-hidden p-2 min-h-0">
                            <img
                                src={previewItem.url || previewItem.previewUrl}
                                alt={previewItem.original_name || previewItem.filename || 'Preview'}
                                className="max-h-[78vh] max-w-full rounded-lg object-contain shadow-md"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
