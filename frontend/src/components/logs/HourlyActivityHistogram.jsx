import React from 'react';

export function HourlyActivityHistogram({
    analytics,
    maxHourlyCount,
    colorMode,
    setColorMode,
    hoveredBucket,
    setHoveredBucket
}) {
    if (!analytics) return null;

    return (
        <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-b from-[#181c26] to-[#131620] border border-[#272d3d] shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-[#F1F3F5] tracking-tight">24-Hour Event Density & Hourly Activity</h3>
                </div>
                <div className="flex items-center gap-3">
                    {/* Color Mode Switcher */}
                    <div className="flex items-center p-0.5 rounded-lg bg-[#11131c] border border-[#272d3d] text-[10px] font-mono">
                        <button
                            type="button"
                            onClick={() => setColorMode('status')}
                            className={`px-2 py-0.5 rounded transition cursor-pointer ${
                                colorMode === 'status' 
                                    ? 'bg-blue-600/30 text-blue-300 font-medium' 
                                    : 'text-[#828c9e] hover:text-[#E8EAED]'
                            }`}
                        >
                            HTTP Codes
                        </button>
                        <button
                            type="button"
                            onClick={() => setColorMode('severity')}
                            className={`px-2 py-0.5 rounded transition cursor-pointer ${
                                colorMode === 'severity' 
                                    ? 'bg-blue-600/30 text-blue-300 font-medium' 
                                    : 'text-[#828c9e] hover:text-[#E8EAED]'
                            }`}
                        >
                            Severity
                        </button>
                    </div>
                    <span className="text-[10px] font-mono text-[#828c9e]">Peak: {maxHourlyCount.toLocaleString()} events/hr</span>
                </div>
            </div>

            {/* Interactive Floating Hover Details Card */}
            {hoveredBucket && (
                <div className="p-2.5 rounded-lg bg-[#11141d] border border-blue-500/30 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs font-mono animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold text-[11px]">
                            Bucket {hoveredBucket.hour}
                        </span>
                        <span className="text-[#F1F3F5] font-bold">
                            {Number(hoveredBucket.count).toLocaleString()} events
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                        <span className="flex items-center gap-1 text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            2xx: {(hoveredBucket.status?.['2xx'] || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-sky-400">
                            <span className="w-2 h-2 rounded-full bg-sky-400" />
                            3xx: {(hoveredBucket.status?.['3xx'] || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            4xx: {(hoveredBucket.status?.['4xx'] || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            5xx / Err: {((hoveredBucket.status?.['5xx'] || 0) + (hoveredBucket.levels?.ERROR || 0)).toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            {/* Bar Graph rendered via SVG with crisp flat stacked segments & integrated axis ticks */}
            <div 
                className="w-full pt-2 pb-1 border-b border-[#272d3d]"
                onMouseLeave={() => setHoveredBucket(null)}
            >
                <svg className="w-full h-36 overflow-visible" viewBox="0 0 480 115" preserveAspectRatio="none">
                    <defs>
                        {analytics.hourly_timeline?.map((h, idx) => {
                            const slotWidth = 480 / 24;
                            const barWidth = Math.max(slotWidth - 3, 7);
                            const x = idx * slotWidth + (slotWidth - barWidth) / 2;
                            return (
                                <clipPath key={`clip_${idx}`} id={`bar_clip_${idx}`}>
                                    <rect x={x} y="4" width={barWidth} height="92" rx="2" />
                                </clipPath>
                            );
                        })}
                    </defs>

                    {/* Baseline track line */}
                    <line x1="0" y1="96" x2="480" y2="96" stroke="#272d3d" strokeWidth="1" />

                    {analytics.hourly_timeline?.map((h, idx) => {
                        const total = Number(h.count) || 0;
                        const slotWidth = 480 / 24;
                        const barWidth = Math.max(slotWidth - 3, 7);
                        const x = idx * slotWidth + (slotWidth - barWidth) / 2;
                        const totalHeight = maxHourlyCount > 0 
                            ? Math.max((total / maxHourlyCount) * 88, total > 0 ? 8 : 3)
                            : (total > 0 ? 8 : 3);
                        const baseY = 96;

                        if (total === 0) {
                            return (
                                <rect
                                    key={h.hour}
                                    x={x}
                                    y={baseY - 3}
                                    width={barWidth}
                                    height={3}
                                    rx="1.5"
                                    fill="#202433"
                                    onMouseEnter={() => setHoveredBucket(h)}
                                    className="cursor-pointer"
                                />
                            );
                        }

                        // Stacked segment calculation
                        let segments = [];
                        if (colorMode === 'status') {
                            const c2 = h.status?.['2xx'] || 0;
                            const c3 = h.status?.['3xx'] || 0;
                            const c4 = h.status?.['4xx'] || 0;
                            const c5 = (h.status?.['5xx'] || 0) + (h.levels?.ERROR || 0);
                            const other = Math.max(0, total - (c2 + c3 + c4 + c5));

                            segments = [
                                { count: c2, fill: '#10b981' }, // 2xx Emerald
                                { count: c3, fill: '#38bdf8' }, // 3xx Sky
                                { count: c4, fill: '#fbbf24' }, // 4xx Amber
                                { count: c5, fill: '#f43f5e' }, // 5xx / Error Rose
                                { count: other, fill: '#3b82f6' }, // Other Blue
                            ].filter(s => s.count > 0);
                        } else {
                            const info = h.levels?.INFO || 0;
                            const warn = h.levels?.WARNING || 0;
                            const err = (h.levels?.ERROR || 0) + (h.levels?.CRITICAL || 0);
                            const dbg = h.levels?.DEBUG || 0;

                            segments = [
                                { count: info, fill: '#3b82f6' }, // Info Blue
                                { count: warn, fill: '#f59e0b' }, // Warning Amber
                                { count: err, fill: '#ef4444' }, // Error Red
                                { count: dbg, fill: '#64748b' }, // Debug Slate
                            ].filter(s => s.count > 0);
                        }

                        if (segments.length === 0) {
                            segments = [{ count: total, fill: '#3b82f6' }];
                        }

                        let currY = baseY;
                        return (
                            <g 
                                key={h.hour} 
                                className="group cursor-pointer"
                                clipPath={`url(#bar_clip_${idx})`}
                                onMouseEnter={() => setHoveredBucket(h)}
                            >
                                {segments.map((seg, sIdx) => {
                                    const segHeight = Math.max((seg.count / total) * totalHeight, 2);
                                    currY -= segHeight;
                                    return (
                                        <rect
                                            key={sIdx}
                                            x={x}
                                            y={currY}
                                            width={barWidth}
                                            height={segHeight}
                                            fill={seg.fill}
                                            className="transition-opacity hover:opacity-85"
                                        />
                                    );
                                })}
                            </g>
                        );
                    })}

                    {/* Integrated SVG Axis Timestamps directly anchored under corresponding hours */}
                    {[
                        { hour: '00:00', idx: 0 },
                        { hour: '04:00', idx: 4 },
                        { hour: '08:00', idx: 8 },
                        { hour: '12:00', idx: 12 },
                        { hour: '16:00', idx: 16 },
                        { hour: '20:00', idx: 20 },
                        { hour: '23:00', idx: 23 },
                    ].map((tick) => {
                        const slotWidth = 480 / 24;
                        const tickX = tick.idx * slotWidth + slotWidth / 2;
                        return (
                            <text
                                key={tick.hour}
                                x={tickX}
                                y="110"
                                textAnchor={tick.idx === 0 ? "start" : tick.idx === 23 ? "end" : "middle"}
                                fill="#828c9e"
                                fontSize="9"
                                fontFamily="monospace"
                            >
                                {tick.hour}
                            </text>
                        );
                    })}
                </svg>
            </div>

            {/* Legend Row */}
            <div className="flex items-center justify-between gap-3 pt-1 text-[10px] font-mono text-[#828c9e]">
                <div className="flex items-center gap-3.5 flex-wrap">
                    {colorMode === 'status' ? (
                        <>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> 2xx Success</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> 3xx Redirect</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#fbbf24]" /> 4xx Client</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#f43f5e]" /> 5xx / Error</span>
                        </>
                    ) : (
                        <>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> INFO</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> WARNING</span>
                            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> ERROR</span>
                        </>
                    )}
                </div>
                <div className="text-[10px] text-[#828c9e]">
                    Hover bar for detailed metrics
                </div>
            </div>
        </div>
    );
}
