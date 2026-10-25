import React, { useMemo, useCallback } from 'react';
import { marked } from 'marked';
import { toast } from '../services/toastService';
import { getFileInfo, getFileSvgHtml } from '../constants/fileIcons';

// Escape HTML utility for code blocks
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Configure custom marked extensions for tables, file links, and code blocks
marked.use({
    gfm: true,
    breaks: true,
    renderer: {
        table(token) {
            const headerHtml = token.header && token.header.length > 0
                ? '<tr>' + token.header.map(cell => {
                    const text = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
                    return `<th class="border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-left text-zinc-300 font-semibold whitespace-nowrap">${text}</th>`;
                }).join('') + '</tr>'
                : '';

            const bodyHtml = token.rows && token.rows.length > 0
                ? token.rows.map(row => '<tr>' + row.map(cell => {
                    const text = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
                    return `<td class="border border-zinc-800/80 px-3 py-1.5 text-zinc-300 [word-break:break-word]">${text}</td>`;
                }).join('') + '</tr>').join('')
                : '';

            return `<div class="table-container my-3 w-full max-w-full min-w-0 overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/60 shadow-inner scrollbar-thin select-text">
                <table class="w-full text-left border-collapse text-[11px] min-w-full">
                    ${headerHtml ? `<thead>${headerHtml}</thead>` : ''}
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>`;
        },

        link(token) {
            const href = token.href || '#';
            const rawText = token.text || token.href;
            const isFile = href.startsWith('file://') || href.startsWith('file:/');

            if (isFile) {
                // Decode URI components and clean up file path
                const decodedPath = decodeURIComponent(href.replace(/^file:\/\/\/?/, ''));
                const fileInfo = getFileInfo(decodedPath);
                // Format clean label: if raw text was a long file:/// URL, use basename or relative path
                let label = rawText;
                if (label.startsWith('file://') || label.startsWith('file:/')) {
                    const parts = decodedPath.split(/[\/\\]/);
                    label = parts[parts.length - 1] || decodedPath;
                }

                const svgHtml = getFileSvgHtml(decodedPath, 'w-3.5 h-3.5 inline-block shrink-0 align-text-bottom mr-1');

                return `<button type="button" class="file-link-pill inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-lg border max-w-full break-all cursor-pointer transition active:scale-95 shadow-xs align-baseline my-0.5 ${fileInfo.bg} ${fileInfo.color} hover:opacity-80" data-file-path="${escapeHtml(decodedPath)}" title="${escapeHtml(fileInfo.label)}: ${escapeHtml(decodedPath)}">
                    ${svgHtml}
                    <span class="truncate max-w-xs md:max-w-md">${escapeHtml(label)}</span>
                </button>`;
            }

            return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline underline-offset-2 break-all [word-break:break-all] hover:text-blue-300 transition">${rawText}</a>`;
        },

        code(token) {
            const lang = token.lang || '';
            const codeText = token.text || '';
            return `<div class="code-container my-2.5 w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-inner">
                ${lang ? `<div class="flex items-center justify-between px-3 py-1 bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 select-none"><span>${escapeHtml(lang)}</span></div>` : ''}
                <pre class="p-3 font-mono text-[11px] leading-relaxed text-zinc-200 w-full max-w-full min-w-0 overflow-x-auto select-text scrollbar-thin"><code>${escapeHtml(codeText)}</code></pre>
            </div>`;
        },

        codespan(token) {
            const text = token.text || '';
            return `<code class="font-mono text-[11px] bg-zinc-900/90 text-amber-300 px-1.5 py-0.5 rounded border border-zinc-800 break-all [word-break:break-all] [overflow-wrap:anywhere] select-text">${escapeHtml(text)}</code>`;
        }
    }
});

export default function MarkdownView({ content, onOpenFile }) {
    const html = useMemo(() => {
        if (!content) return '';
        try {
            return marked.parse(content);
        } catch {
            return escapeHtml(content);
        }
    }, [content]);

    const handleClick = useCallback((e) => {
        const fileBtn = e.target.closest('[data-file-path]');
        if (fileBtn) {
            e.preventDefault();
            e.stopPropagation();
            const filePath = fileBtn.getAttribute('data-file-path');
            if (filePath) {
                if (typeof onOpenFile === 'function') {
                    onOpenFile(filePath);
                } else if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('agentwatch:open-file', { detail: { path: filePath } }));
                }
            }
        }
    }, [onOpenFile]);

    if (!content) return null;

    return (
        <div
            onClick={handleClick}
            className="prose prose-invert max-w-none w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-x-hidden text-xs md:text-sm text-zinc-200 leading-relaxed markdown-content
                       [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-zinc-100 [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:break-words
                       [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-zinc-100 [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h2]:break-words
                       [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-zinc-200 [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:break-words
                       [&_p]:my-1.5 [&_p]:leading-relaxed [&_p]:break-words [&_p]:[overflow-wrap:anywhere]
                       [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ul]:space-y-0.5
                       [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ol]:space-y-0.5
                       [&_li]:leading-relaxed [&_li]:break-words [&_li]:[overflow-wrap:anywhere]
                       [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-2 [&_blockquote]:break-words
                       [&_hr]:border-zinc-800 [&_hr]:my-3"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
