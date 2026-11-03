import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Icon } from '../constants/icons';

let mermaidInitialized = false;

function ensureMermaidInitialized() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    darkMode: true,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    themeVariables: {
      darkMode: true,
      background: '#121417',
      primaryColor: '#1e293b',
      primaryTextColor: '#e2e8f0',
      primaryBorderColor: '#334155',
      lineColor: '#64748b',
      secondaryColor: '#1e293b',
      tertiaryColor: '#0f172a',
    },
  });
  mermaidInitialized = true;
}

export default function MermaidBlock({ chartCode }) {
  const containerRef = useRef(null);
  const [svgContent, setSvgContent] = useState('');
  const [renderError, setRenderError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    ensureMermaidInitialized();

    const renderChart = async () => {
      if (!chartCode) return;
      const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
      try {
        const { svg } = await mermaid.render(id, chartCode.trim());
        if (!isCancelled) {
          setSvgContent(svg);
          setRenderError(null);
        }
      } catch (err) {
        if (!isCancelled) {
          setRenderError(err?.message || 'Failed to render diagram');
          setSvgContent('');
        }
      }
    };

    renderChart();
    return () => {
      isCancelled = true;
    };
  }, [chartCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chartCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="my-3 w-full max-w-full rounded-xl border border-zinc-800 bg-[#121417] overflow-hidden select-text shadow-inner">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#17191d] border-b border-zinc-800/80 text-[10px] font-mono text-zinc-400 select-none">
        <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Mermaid Diagram
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-zinc-200 transition cursor-pointer px-1.5 py-0.5 rounded hover:bg-zinc-800/60"
          title="Copy diagram source code"
        >
          <div className="w-3 h-3 text-cyan-400">{copied ? Icon.check : Icon.copy}</div>
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="p-3 w-full max-w-full overflow-x-auto flex justify-center items-center">
        {renderError ? (
          <div className="text-left w-full space-y-2">
            <div className="text-xs text-rose-400 font-mono">Failed to render diagram: {renderError}</div>
            <pre className="p-2.5 rounded bg-zinc-950 text-[11px] font-mono text-zinc-400 overflow-x-auto">
              <code>{chartCode}</code>
            </pre>
          </div>
        ) : svgContent ? (
          <div
            ref={containerRef}
            className="w-full flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="py-6 flex items-center gap-2 text-zinc-500 font-mono text-xs">
            <span className="w-3 h-3 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
            Rendering diagram...
          </div>
        )}
      </div>
    </div>
  );
}

