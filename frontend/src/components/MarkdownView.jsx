import React, { useMemo, useCallback } from 'react';
import { marked } from 'marked';
import { getFileInfo, getFileSvgHtml } from '../constants/fileIcons';
import { isValidFilePath, parseFileLink } from '../utils/fileLinkParser';
import { sanitizeHtml } from '../utils/sanitizer';
import MermaidBlock from './MermaidBlock';

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

      // Clean accidental trailing punctuation/parenthesis
      if (rawText.endsWith(')') && !rawText.includes('(')) {
        rawText = rawText.slice(0, -1).trim();
      }
      if (href.endsWith(')') && !href.includes('(')) {
        href = href.slice(0, -1).trim();
      }

      const isFileUri = href.startsWith('file://') || href.startsWith('file:/');

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
        if (
          label.startsWith('file://') ||
          label.startsWith('file:/') ||
          label.includes('/') ||
          label.includes('\\')
        ) {
          label = parsed.filename || label;
        }

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

      // Intercept mermaid blocks with an extraction marker
      if (lang.toLowerCase() === 'mermaid') {
        const b64 = btoa(unescape(encodeURIComponent(codeText)));
        return `<div data-mermaid-code="${b64}"></div>`;
      }

      const copyB64 = btoa(unescape(encodeURIComponent(codeText)));

      return `<div class="code-container my-2.5 w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950 shadow-inner group/code">
                <div class="flex items-center justify-between px-3 py-1 bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 select-none">
                  <span>${escapeHtml(lang || 'code')}</span>
                  <button type="button" data-copy-code="${copyB64}" class="code-copy-btn hover:text-zinc-200 transition cursor-pointer flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-zinc-800/60" title="Copy code snippet">
                    <svg class="w-3 h-3 text-cyan-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    <span>Copy</span>
                  </button>
                </div>
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
  // Parse content and segment mermaid blocks so they render as React MermaidBlock components
  const segments = useMemo(() => {
    if (!content) return [];
    try {
      const parsed = marked.parse(content);
      const sanitized = sanitizeHtml(parsed);

      const parts = sanitized.split(/(<div data-mermaid-code="[A-Za-z0-9+/=]+"><\/div>)/g);
      return parts.map(part => {
        const match = part.match(/<div data-mermaid-code="([A-Za-z0-9+/=]+)"><\/div>/);
        if (match && match[1]) {
          try {
            const chartCode = decodeURIComponent(escape(atob(match[1])));
            return { type: 'mermaid', code: chartCode };
          } catch {
            return { type: 'html', html: part };
          }
        }
        return { type: 'html', html: part };
      });
    } catch {
      return [{ type: 'html', html: escapeHtml(content) }];
    }
  }, [content]);

  const handleClick = useCallback(
    e => {
      // 1. Handle Copy Code Button
      const copyBtn = e.target.closest('[data-copy-code]');
      if (copyBtn) {
        e.preventDefault();
        e.stopPropagation();
        const b64 = copyBtn.getAttribute('data-copy-code');
        if (b64) {
          try {
            const rawCode = decodeURIComponent(escape(atob(b64)));
            navigator.clipboard.writeText(rawCode);
            const label = copyBtn.querySelector('span');
            if (label) {
              const prevText = label.innerText;
              label.innerText = 'Copied!';
              setTimeout(() => {
                label.innerText = prevText;
              }, 1500);
            }
          } catch {}
        }
        return;
      }

      // 2. Handle File Link Pill Click
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
    >
      {segments.map((seg, idx) =>
        seg.type === 'mermaid' ? (
          <MermaidBlock key={`mermaid-${idx}`} chartCode={seg.code} />
        ) : (
          <div key={`html-${idx}`} dangerouslySetInnerHTML={{ __html: seg.html }} />
        )
      )}
    </div>
  );
}
