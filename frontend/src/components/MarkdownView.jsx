import React, { useMemo, useCallback } from 'react';
import { marked } from 'marked';
import { toast } from '../services/toastService';
import { getFileInfo, getFileSvgHtml } from '../constants/fileIcons';
import { isValidFilePath, parseFileLink } from '../utils/fileLinkParser';
import { sanitizeHtml } from '../utils/sanitizer';

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
      const headerHtml =
        token.header && token.header.length > 0
          ? '<tr>' +
            token.header
              .map(cell => {
                const text = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
                return `<th class="border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-left text-zinc-300 font-semibold whitespace-nowrap">${text}</th>`;
              })
              .join('') +
            '</tr>'
          : '';

      const bodyHtml =
        token.rows && token.rows.length > 0
          ? token.rows
              .map(
                row =>
                  '<tr>' +
                  row
                    .map(cell => {
                      const text = cell.tokens ? this.parser.parseInline(cell.tokens) : cell.text;
                      return `<td class="border border-zinc-800/80 px-3 py-1.5 text-zinc-300 [word-break:break-word]">${text}</td>`;
                    })
                    .join('') +
                  '</tr>'
              )
              .join('')
          : '';

      return `<div class="table-container my-3 w-full max-w-full min-w-0 overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/60 shadow-inner scrollbar-thin select-text">
                <table class="w-full text-left border-collapse text-[11px] min-w-full">
                    ${headerHtml ? `<thead>${headerHtml}</thead>` : ''}
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>`;
    },

    link(token) {
      let href = token.href || '#';
      let rawText = token.text || token.href || '';

      // Clean accidental trailing punctuation/parenthesis (e.g. from markdown wrapping "...[file](url))")
      if (rawText.endsWith(')') && !rawText.includes('(')) {
        rawText = rawText.slice(0, -1).trim();
      }
      if (href.endsWith(')') && !href.includes('(')) {
        href = href.slice(0, -1).trim();
      }

      const isFileUri = href.startsWith('file://') || href.startsWith('file:/');

      // Check if href is a file URI or a direct file path (e.g. "frontend/src/App.jsx")
      let targetPath = href;
      if (isFileUri) {
        targetPath = decodeURIComponent(href.replace(/^file:\/\/\/?/, ''));
        if (/^\/[a-zA-Z]:/.test(targetPath)) {
          targetPath = targetPath.slice(1);
        }
      }

      if (isValidFilePath(targetPath)) {
        const parsed = parseFileLink(targetPath);
        const fileInfo = getFileInfo(parsed.cleanPath || targetPath);
        let label = rawText;
        // If label was a raw file:// URI or raw path, use a clean basename
        if (
          label.startsWith('file://') ||
          label.startsWith('file:/') ||
          label.includes('/') ||
          label.includes('\\')
        ) {
          label = parsed.filename || label;
        }

        // If line highlight was present, append to label if not already present
        if (
          parsed.hasHighlight &&
          !label.includes(':') &&
          !label.includes('#') &&
          !label.includes('L')
        ) {
          label = `${label} (L${parsed.startLine}${parsed.endLine && parsed.endLine !== parsed.startLine ? `-${parsed.endLine}` : ''})`;
        }

        const svgHtml = getFileSvgHtml(
          parsed.cleanPath,
          'w-3 h-3 inline-block shrink-0 -mt-0.5 mr-0.5'
        );

        return `<button type="button" class="file-link-pill inline-flex items-center gap-1 font-mono text-[11px] font-medium px-1.5 py-0.2 mx-0.5 rounded-md border max-w-full break-all cursor-pointer transition active:scale-95 align-middle select-none ${fileInfo.bg} ${fileInfo.color} hover:brightness-125" data-file-path="${escapeHtml(parsed.cleanPath)}" data-start-line="${parsed.startLine || ''}" data-end-line="${parsed.endLine || ''}" title="${escapeHtml(fileInfo.label)}: ${escapeHtml(parsed.cleanPath)}">
                    ${svgHtml}
                    <span class="truncate max-w-xs md:max-w-md">${escapeHtml(label)}</span>
                </button>`;
      }

      // Clean display label for any remaining file URI links that were not valid file paths
      let cleanDisplay = rawText;
      if (cleanDisplay.startsWith('file://') || cleanDisplay.startsWith('file:/')) {
        const parts = cleanDisplay.split(/[\/\\]/);
        cleanDisplay = parts[parts.length - 1] || cleanDisplay;
      }

      return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all [word-break:break-all] transition font-medium">${escapeHtml(cleanDisplay)}</a>`;
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
    },
  },
});

export default function MarkdownView({ content, onOpenFile }) {
  const html = useMemo(() => {
    if (!content) return '';
    try {
      const parsed = marked.parse(content);
      return sanitizeHtml(parsed);
    } catch {
      return escapeHtml(content);
    }
  }, [content]);


  const handleClick = useCallback(
    e => {
      const fileBtn = e.target.closest('[data-file-path]');
      if (fileBtn) {
        e.preventDefault();
        e.stopPropagation();
        const filePath = fileBtn.getAttribute('data-file-path');
        const startLineAttr = fileBtn.getAttribute('data-start-line');
        const endLineAttr = fileBtn.getAttribute('data-end-line');
        const startLine = startLineAttr ? parseInt(startLineAttr, 10) : undefined;
        const endLine = endLineAttr ? parseInt(endLineAttr, 10) : undefined;

        if (filePath) {
          const lineRange = { startLine, endLine };
          if (typeof onOpenFile === 'function') {
            onOpenFile(filePath, lineRange);
          } else if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('agentwatch:open-file', { detail: { path: filePath, ...lineRange } })
            );
          }
        }
      }
    },
    [onOpenFile]
  );

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
