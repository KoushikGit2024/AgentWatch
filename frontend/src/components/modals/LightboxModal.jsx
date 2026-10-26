import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '../../constants/icons';

export default function LightboxModal({ isOpen, onClose, screenshotUrl }) {
  const [zoom, setZoom] = useState(1); // 1 = fit, 1.5, 2, 3
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ left: 0, top: 0 });
  const containerRef = useRef(null);

  // Reset zoom on open
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
    }
  }, [isOpen, screenshotUrl]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = e => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '+' || e.key === '=')
        setZoom(z => Math.min(Number((z + 0.25).toFixed(2)), 4));
      else if (e.key === '-' || e.key === '_')
        setZoom(z => Math.max(Number((z - 0.25).toFixed(2)), 0.5));
      else if (e.key === '0') setZoom(1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Mouse wheel zoom with Ctrl or meta
  const handleWheel = useCallback(e => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      setZoom(prev => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.5), 4));
    }
  }, []);

  // Drag to pan when zoomed in
  const handleMouseDown = e => {
    if (zoom <= 1 || e.button !== 0 || !containerRef.current) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setScrollStart({
      left: containerRef.current.scrollLeft,
      top: containerRef.current.scrollTop,
    });
  };

  const handleMouseMove = e => {
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

  if (!isOpen || !screenshotUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Antigravity IDE Viewport"
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-2 sm:p-4 select-none animate-in fade-in duration-150"
      onMouseUp={handleMouseUp}
    >
      {/* Header controls bar */}
      <div className="flex items-center justify-between pb-2 border-b border-[#30343A] shrink-0 px-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs sm:text-sm font-semibold text-[#E8EAED] tracking-tight truncate">
            Antigravity Viewport Inspector
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1D2024] text-[#A0A6AF] border border-[#30343A] shrink-0">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setZoom(z => Math.min(Number((z + 0.25).toFixed(2)), 4))}
            title="Zoom In (+)"
            className="p-1.5 rounded bg-[#1D2024] hover:bg-[#23272D] text-[#E8EAED] border border-[#30343A] transition cursor-pointer text-xs"
          >
            <div className="w-3.5 h-3.5">{Icon.plus}</div>
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setZoom(z => Math.max(Number((z - 0.25).toFixed(2)), 0.5))}
            title="Zoom Out (-)"
            className="p-1.5 rounded bg-[#1D2024] hover:bg-[#23272D] text-[#E8EAED] border border-[#30343A] transition cursor-pointer text-xs"
          >
            <div className="w-3.5 h-3.5">{Icon.minimize}</div>
          </button>

          {/* Fit / 100% Toggle */}
          <button
            type="button"
            onClick={() => setZoom(z => (z === 1 ? 1.5 : 1))}
            title="Toggle Zoom Fit / 150%"
            className="px-2 py-1 rounded bg-[#1D2024] hover:bg-[#23272D] text-[#E8EAED] border border-[#30343A] transition cursor-pointer text-xs font-mono font-medium"
          >
            {zoom === 1 ? '150%' : 'Fit'}
          </button>

          {/* Reset Zoom */}
          {zoom !== 1 && (
            <button
              type="button"
              onClick={() => setZoom(1)}
              title="Reset to 100% / Fit (0)"
              className="px-2 py-1 rounded bg-[#1D2024] hover:bg-[#23272D] text-[#A0A6AF] hover:text-[#E8EAED] border border-[#30343A] transition cursor-pointer text-xs font-mono"
            >
              Reset
            </button>
          )}

          <div className="h-4 w-px bg-[#30343A] mx-1" />

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="p-1.5 rounded text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-rose-950/40 hover:text-rose-400 transition cursor-pointer"
          >
            <div className="w-4 h-4">{Icon.x}</div>
          </button>
        </div>
      </div>

      {/* Interactive Scroll & Pan Viewport */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className={`flex-1 overflow-auto flex min-h-0 min-w-0 p-2 sm:p-4 bg-[#101113] rounded-lg mt-2 relative ${
          zoom > 1
            ? isPanning
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-default items-center justify-center'
        }`}
      >
        <div
          className="transition-transform duration-100 ease-out origin-top-left m-auto"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: zoom > 1 ? 'top left' : 'center center',
          }}
        >
          <img
            src={screenshotUrl}
            alt="Antigravity IDE Viewport"
            draggable={false}
            className={`rounded border border-[#30343A] shadow-2xl ${
              zoom === 1 ? 'max-w-full max-h-[82dvh] object-contain' : 'max-w-none'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
