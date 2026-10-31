import React from 'react';
import { FileText, AlertTriangle, Activity, Clock } from 'lucide-react';

export function LogKpiCards({ analytics }) {
  if (!analytics) return null;

  const totalRequests = (analytics.pie_status || []).reduce((acc, s) => acc + s.count, 0);
  const errorCount = (analytics.level_counts?.ERROR || 0) + (analytics.level_counts?.CRITICAL || 0);

  return (
    <div className="grid grid-cols-2 xs:grid-cols-2 md:grid-cols-4 gap-2.5">
      <div className="p-3.5 rounded-xl bg-[#141720] border border-[#272d3d] shadow-sm flex flex-col justify-between">
        <span className="text-[11px] font-mono text-[#828c9e] flex items-center justify-between">
          Total Log Lines
          <FileText className="w-3.5 h-3.5 text-blue-400" />
        </span>
        <div className="mt-1">
          <span className="text-lg sm:text-xl font-bold text-[#F1F3F5] font-mono tabular-nums">
            {analytics.total_lines?.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#828c9e] block">
            {analytics.parsed_entries?.toLocaleString()} structured
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#141720] border border-[#272d3d] shadow-sm flex flex-col justify-between">
        <span className="text-[11px] font-mono text-[#828c9e] flex items-center justify-between">
          Errors / Critical
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        </span>
        <div className="mt-1">
          <span
            className={`text-lg sm:text-xl font-bold font-mono tabular-nums ${
              errorCount > 0 ? 'text-rose-400' : 'text-[#F1F3F5]'
            }`}
          >
            {errorCount}
          </span>
          <span className="text-[10px] text-[#828c9e] block">
            {analytics.level_counts?.WARNING || 0} warnings
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#141720] border border-[#272d3d] shadow-sm flex flex-col justify-between">
        <span className="text-[11px] font-mono text-[#828c9e] flex items-center justify-between">
          HTTP Requests
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
        </span>
        <div className="mt-1">
          <span className="text-lg sm:text-xl font-bold text-emerald-400 font-mono tabular-nums">
            {totalRequests.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#828c9e] block">FastAPI & Uvicorn hits</span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-[#141720] border border-[#272d3d] shadow-sm flex flex-col justify-between">
        <span className="text-[11px] font-mono text-[#828c9e] flex items-center justify-between">
          Timespan Covered
          <Clock className="w-3.5 h-3.5 text-amber-400" />
        </span>
        <div className="mt-1">
          <span className="text-xs font-semibold text-[#F1F3F5] font-mono truncate block">
            {analytics.first_timestamp ? analytics.first_timestamp.split(' ')[1] : '00:00:00'} →{' '}
            {analytics.last_timestamp ? analytics.last_timestamp.split(' ')[1] : '23:59:59'}
          </span>
          <span className="text-[10px] text-[#828c9e] block">Full 24-hr cycle</span>
        </div>
      </div>
    </div>
  );
}
