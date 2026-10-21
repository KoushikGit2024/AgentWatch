import React, { useMemo } from 'react';
import { marked } from 'marked';

// Configure marked options
marked.setOptions({
    gfm: true,
    breaks: true,
});

export default function MarkdownView({ content }) {
    if (!content) return null;

    const html = useMemo(() => {
        try {
            return marked.parse(content);
        } catch {
            return content;
        }
    }, [content]);

    return (
        <div
            className="prose prose-invert max-w-none w-full min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word] overflow-x-hidden text-xs md:text-sm text-zinc-200 leading-relaxed markdown-content
                       [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-zinc-100 [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:break-words
                       [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-zinc-100 [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h2]:break-words
                       [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-zinc-200 [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:break-words
                       [&_p]:my-1.5 [&_p]:leading-relaxed [&_p]:break-words
                       [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ul]:space-y-0.5
                       [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_ol]:space-y-0.5
                       [&_li]:leading-relaxed [&_li]:break-words
                       [&_code]:font-mono [&_code]:text-[11px] [&_code]:bg-zinc-900 [&_code]:text-amber-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:border [&_code]:border-zinc-800 [&_code]:break-all
                       [&_pre]:my-2 [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:bg-zinc-950 [&_pre]:border [&_pre]:border-zinc-800/90 [&_pre]:w-full [&_pre]:max-w-full [&_pre]:overflow-x-auto
                       [&_pre_code]:bg-transparent [&_pre_code]:border-none [&_pre_code]:p-0 [&_pre_code]:text-zinc-200 [&_pre_code]:break-normal
                       [&_blockquote]:border-l-2 [&_blockquote]:border-blue-500 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-2 [&_blockquote]:break-words
                       [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:my-2 [&_table]:border-collapse [&_table]:text-[11px]
                       [&_th]:border [&_th]:border-zinc-800 [&_th]:bg-zinc-900 [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_th]:text-zinc-300 [&_th]:font-semibold [&_th]:whitespace-nowrap
                       [&_td]:border [&_td]:border-zinc-800 [&_td]:px-2.5 [&_td]:py-1.5 [&_td]:text-zinc-300
                       [&_hr]:border-zinc-800 [&_hr]:my-3
                       [&_a]:text-blue-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:break-all hover:[&_a]:text-blue-300"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
