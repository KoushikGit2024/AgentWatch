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
    return (
        <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[#101113] relative">
            {isImage && (
                <div className="max-w-full max-h-full flex items-center justify-center p-2">
                    <img
                        src={rawUrl}
                        alt={fileData?.filename || 'Image Artifact'}
                        className="max-w-full max-h-[72dvh] object-contain rounded-md border border-[#30343A] bg-[#17191C]"
                        loading="lazy"
                    />
                </div>
            )}
            {isVideo && (
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
            )}
            {isAudio && (
                <div className="p-6 rounded-lg bg-[#17191C] border border-[#30343A] flex flex-col items-center gap-3">
                    <div className="text-xs font-mono text-[#E8EAED]">{fileData?.filename || 'Audio Track'}</div>
                    <audio controls src={rawUrl} className="w-64 sm:w-80" />
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
