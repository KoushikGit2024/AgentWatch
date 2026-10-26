import React from 'react';
import MarkdownView from '../MarkdownView';

export function getMonacoLanguage(ext = '', filename = '') {
    const cleanExt = (ext || '').toLowerCase().replace(/^\./, '');
    const lowerName = (filename || '').toLowerCase();

    if (lowerName === 'dockerfile') return 'dockerfile';
    if (lowerName === 'makefile') return 'makefile';

    const MAP = {
        js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
        ts: 'typescript', mts: 'typescript', cts: 'typescript', tsx: 'typescript',
        py: 'python', pyw: 'python', ipynb: 'json',
        json: 'json', jsonc: 'json', json5: 'json',
        html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'scss', less: 'less',
        md: 'markdown', markdown: 'markdown',
        sh: 'shell', bash: 'shell', zsh: 'shell', ps1: 'powershell', bat: 'bat', cmd: 'bat',
        yaml: 'yaml', yml: 'yaml', toml: 'ini', ini: 'ini', cfg: 'ini', conf: 'ini',
        env: 'shell', sql: 'sql', graphql: 'graphql', gql: 'graphql',
        rs: 'rust', go: 'go', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp',
        cs: 'csharp', java: 'java', kt: 'kotlin', php: 'php', rb: 'ruby', xml: 'xml', svg: 'xml'
    };

    return MAP[cleanExt] || 'plaintext';
}

export function MediaPreviewViewport({ isImage, isVideo, isAudio, fileData, filePath }) {
    const rawUrl = fileData?.raw_url || `/api/v1/files/raw?path=${encodeURIComponent(filePath)}`;
    const [zoom, setZoom] = React.useState(1);
    const [isPanning, setIsPanning] = React.useState(false);
    const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = React.useState({ left: 0, top: 0 });
    const containerRef = React.useRef(null);

    React.useEffect(() => {
        setZoom(1);
    }, [filePath, rawUrl]);

    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.2 : -0.2;
            setZoom(prev => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.5), 4));
        }
    };

    const handleMouseDown = (e) => {
        if (zoom <= 1 || e.button !== 0 || !containerRef.current) return;
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
        setScrollStart({
            left: containerRef.current.scrollLeft,
            top: containerRef.current.scrollTop
        });
    };

    const handleMouseMove = (e) => {
        if (!isPanning || !containerRef.current) return;
        e.preventDefault();
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        containerRef.current.scrollLeft = scrollStart.left - dx;
        containerRef.current.scrollTop = scrollStart.top - dy;
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[#101113] relative select-none" onMouseUp={handleMouseUp}>
            {isImage && (
                <>
                    {/* Zoom Toolbar for Image / Screenshot */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-[#17191C] border-b border-[#262A30] text-xs shrink-0 select-none">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-[#A0A6AF]">Zoom:</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#101113] text-[#E8EAED] border border-[#30343A]">
                                {Math.round(zoom * 100)}%
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setZoom(z => Math.max(Number((z - 0.25).toFixed(2)), 0.5))}
                                title="Zoom Out"
                                className="px-2 py-0.5 rounded bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] text-xs text-[#E8EAED] transition cursor-pointer font-mono"
                            >
                                -
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoom(z => Math.min(Number((z + 0.25).toFixed(2)), 4))}
                                title="Zoom In"
                                className="px-2 py-0.5 rounded bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] text-xs text-[#E8EAED] transition cursor-pointer font-mono"
                            >
                                +
                            </button>
                            <button
                                type="button"
                                onClick={() => setZoom(z => (z === 1 ? 1.5 : 1))}
                                title="Toggle Fit / 150%"
                                className="px-2 py-0.5 rounded bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] text-xs text-[#E8EAED] transition cursor-pointer font-mono"
                            >
                                {zoom === 1 ? '150%' : 'Fit'}
                            </button>
                            {zoom !== 1 && (
                                <button
                                    type="button"
                                    onClick={() => setZoom(1)}
                                    title="Reset Zoom"
                                    className="px-2 py-0.5 rounded bg-[#1D2024] hover:bg-[#23272D] border border-[#30343A] text-xs text-[#A0A6AF] hover:text-[#E8EAED] transition cursor-pointer font-mono"
                                >
                                    Reset
                                </button>
                            )}
                            <a
                                href={rawUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                title="Open full raw image in new tab"
                                className="ml-1 text-[11px] font-mono text-[#7C9FC5] hover:underline"
                            >
                                Raw
                            </a>
                        </div>
                    </div>

                    {/* Viewport container with pan and full scroll */}
                    <div
                        ref={containerRef}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        className={`flex-1 overflow-auto flex min-h-0 min-w-0 p-3 sm:p-4 bg-[#101113] relative ${
                            zoom > 1 ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default items-center justify-center'
                        }`}
                    >
                        <div
                            className="transition-transform duration-100 ease-out origin-top-left m-auto"
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: zoom > 1 ? 'top left' : 'center center'
                            }}
                        >
                            <img
                                src={rawUrl}
                                alt={fileData?.filename || 'Image Preview'}
                                draggable={false}
                                className={`rounded-md border border-[#30343A] bg-[#17191C] shadow-lg ${
                                    zoom === 1
                                        ? 'max-w-full max-h-[75dvh] object-contain'
                                        : 'max-w-none'
                                }`}
                                loading="lazy"
                            />
                        </div>
                    </div>
                </>
            )}
            {isVideo && (
                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                    <div className="max-w-4xl w-full flex flex-col items-center justify-center p-2">
                        <video
                            controls
                            autoPlay={false}
                            src={rawUrl}
                            className="max-w-full max-h-[72dvh] rounded-md border border-[#30343A] bg-black"
                        >
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            )}
            {isAudio && (
                <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                    <div className="p-6 rounded-lg bg-[#17191C] border border-[#30343A] flex flex-col items-center gap-3">
                        <div className="text-xs font-mono text-[#E8EAED]">{fileData?.filename || 'Audio Track'}</div>
                        <audio controls src={rawUrl} className="w-64 sm:w-80" />
                    </div>
                </div>
            )}
        </div>
    );
}

export function MarkdownPreviewViewport({ content }) {
    return (
        <div className="flex-1 overflow-auto p-4 sm:p-6 max-w-3xl mx-auto w-full">
            <MarkdownView content={content} />
        </div>
    );
}
