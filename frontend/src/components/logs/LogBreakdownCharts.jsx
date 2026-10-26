import React from 'react';
import { PieChart, Activity } from 'lucide-react';

export function LogBreakdownCharts({ analytics }) {
    if (!analytics) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Log Levels Severity Distribution */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-b from-[#181c26] to-[#131620] border border-[#272d3d] shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-[#F1F3F5]">Severity Level Distribution</h3>
                </div>

                {/* Stacked Proportional Bar */}
                <div className="w-full h-3 rounded-full bg-[#11131c] border border-[#272d3d] overflow-hidden flex">
                    {analytics.pie_levels?.map((pl) => {
                        let bg = 'bg-blue-500';
                        if (pl.level === 'WARNING') bg = 'bg-amber-400';
                        if (pl.level === 'ERROR' || pl.level === 'CRITICAL') bg = 'bg-rose-500';
                        if (pl.level === 'DEBUG') bg = 'bg-slate-600';
                        return (
                            <div
                                key={pl.level}
                                title={`${pl.level}: ${pl.percentage}%`}
                                className={`${bg} h-full transition-all`}
                                style={{ width: `${pl.percentage}%` }}
                            />
                        );
                    })}
                </div>

                {/* Legends & Value Rows */}
                <div className="space-y-1.5 pt-1">
                    {analytics.pie_levels?.map((pl) => {
                        let dot = 'bg-blue-400';
                        if (pl.level === 'WARNING') dot = 'bg-amber-400';
                        if (pl.level === 'ERROR' || pl.level === 'CRITICAL') dot = 'bg-rose-500';
                        if (pl.level === 'DEBUG') dot = 'bg-slate-500';
                        return (
                            <div key={pl.level} className="flex items-center justify-between text-xs font-mono">
                                <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                                    <span className="text-[#A6AFBF]">{pl.level}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[#F1F3F5] tabular-nums font-semibold">{pl.count.toLocaleString()}</span>
                                    <span className="text-[#828c9e] text-[10px] w-12 text-right">({pl.percentage}%)</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* HTTP Status Code Proportions */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-b from-[#181c26] to-[#131620] border border-[#272d3d] shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-semibold text-[#F1F3F5]">HTTP Status Codes</h3>
                </div>

                {/* Stacked Proportional Bar */}
                <div className="w-full h-3 rounded-full bg-[#11131c] border border-[#272d3d] overflow-hidden flex">
                    {analytics.pie_status?.map((ps) => {
                        let bg = 'bg-emerald-500';
                        if (ps.category === '3xx') bg = 'bg-sky-400';
                        if (ps.category === '4xx') bg = 'bg-amber-400';
                        if (ps.category === '5xx') bg = 'bg-rose-500';
                        return (
                            <div
                                key={ps.category}
                                title={`${ps.category}: ${ps.percentage}%`}
                                className={`${bg} h-full transition-all`}
                                style={{ width: `${ps.percentage}%` }}
                            />
                        );
                    })}
                </div>

                {/* Legends & Value Rows */}
                <div className="space-y-1.5 pt-1">
                    {analytics.pie_status?.length === 0 ? (
                        <div className="text-xs text-[#828c9e] py-2">No HTTP access records found in this file.</div>
                    ) : (
                        analytics.pie_status?.map((ps) => {
                            let dot = 'bg-emerald-400';
                            if (ps.category === '3xx') dot = 'bg-sky-400';
                            if (ps.category === '4xx') dot = 'bg-amber-400';
                            if (ps.category === '5xx') dot = 'bg-rose-500';
                            return (
                                <div key={ps.category} className="flex items-center justify-between text-xs font-mono">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                                        <span className="text-[#A6AFBF]">HTTP {ps.category}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#F1F3F5] tabular-nums font-semibold">{ps.count.toLocaleString()}</span>
                                        <span className="text-[#828c9e] text-[10px] w-12 text-right">({ps.percentage}%)</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
