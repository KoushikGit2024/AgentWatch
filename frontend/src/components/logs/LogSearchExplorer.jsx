import React, { useState } from 'react';
import { Search, AlertTriangle, Layers, Globe, Filter } from 'lucide-react';

export function LogSearchExplorer({ analytics }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('ALL');

  if (!analytics) return null;

  const query = searchQuery.toLowerCase().trim();

  // Filter endpoints
  const filteredEndpoints = (analytics.top_endpoints || []).filter(
    ep => !query || ep.endpoint.toLowerCase().includes(query)
  );

  // Filter loggers
  const filteredLoggers = (analytics.top_loggers || []).filter(
    lg => !query || lg.logger.toLowerCase().includes(query)
  );

  // Filter recent error excerpts
  const filteredErrors = (analytics.recent_errors || []).filter(err => {
    const matchesLevel = selectedLevel === 'ALL' || err.level.toUpperCase() === selectedLevel;
    const matchesQuery =
      !query ||
      err.message.toLowerCase().includes(query) ||
      err.logger.toLowerCase().includes(query) ||
      err.time.includes(query);
    return matchesLevel && matchesQuery;
  });

  return (
    <div className="p-3.5 sm:p-4 rounded-xl bg-[#17191C] border border-[#30343A] space-y-3">
      {/* Search Bar & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-semibold text-[#E8EAED]">Search & Diagnostics Filter</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#747C87] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter routes, loggers, or errors..."
              className="w-full bg-[#101113] border border-[#30343A] text-xs font-mono text-[#E8EAED] placeholder-[#747C87] pl-8 pr-2.5 py-1.5 rounded-lg outline-none focus:border-blue-500/60 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#747C87]" />
            <select
              value={selectedLevel}
              onChange={e => setSelectedLevel(e.target.value)}
              className="bg-[#101113] border border-[#30343A] text-[11px] font-mono text-[#E8EAED] px-2 py-1.5 rounded-lg outline-none focus:border-blue-500/60 transition cursor-pointer"
            >
              <option value="ALL">All Levels</option>
              <option value="ERROR">ERROR</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="WARNING">WARNING</option>
            </select>
          </div>
        </div>
      </div>

      {/* Endpoints & Active Loggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Endpoints */}
        <div className="p-3 rounded-lg bg-[#121316] border border-[#262A30] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#A0A6AF] flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Matched Endpoints ({filteredEndpoints.length})</span>
            </span>
            <span className="text-[10px] font-mono text-[#747C87]">Hits</span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {filteredEndpoints.length === 0 ? (
              <div className="text-xs font-mono text-[#747C87] py-2 text-center">
                No matching endpoints found.
              </div>
            ) : (
              filteredEndpoints.map(ep => (
                <div
                  key={ep.endpoint}
                  className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-[#17191C] border border-[#262A30]"
                >
                  <span className="text-[#A0A6AF] truncate pr-2">{ep.endpoint}</span>
                  <span className="text-[#79B89A] font-semibold tabular-nums shrink-0">
                    {ep.count.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Loggers */}
        <div className="p-3 rounded-lg bg-[#121316] border border-[#262A30] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#A0A6AF] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>Matched Loggers ({filteredLoggers.length})</span>
            </span>
            <span className="text-[10px] font-mono text-[#747C87]">Records</span>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {filteredLoggers.length === 0 ? (
              <div className="text-xs font-mono text-[#747C87] py-2 text-center">
                No matching loggers found.
              </div>
            ) : (
              filteredLoggers.map(lg => (
                <div
                  key={lg.logger}
                  className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-[#17191C] border border-[#262A30]"
                >
                  <span className="text-[#E8EAED] font-medium truncate pr-2">[{lg.logger}]</span>
                  <span className="text-blue-400 font-semibold tabular-nums shrink-0">
                    {lg.count.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Error Excerpts */}
      <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 space-y-2">
        <div className="flex items-center justify-between text-rose-400">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">
              Captured Errors ({filteredErrors.length})
            </span>
          </div>
          {query && (
            <span className="text-[10px] font-mono text-rose-300">Filtering: "{query}"</span>
          )}
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {filteredErrors.length === 0 ? (
            <div className="text-xs font-mono text-[#747C87] py-2 text-center">
              {analytics.recent_errors?.length === 0
                ? 'No errors recorded in this log file.'
                : 'No errors matched filter criteria.'}
            </div>
          ) : (
            filteredErrors.map((err, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-[#121316] border border-rose-900/30 text-xs font-mono space-y-0.5"
              >
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-[#747C87]">{err.time}</span>
                  <span className="px-1 py-0.2 rounded bg-rose-900/60 text-rose-200 uppercase">
                    {err.level}
                  </span>
                  <span className="text-rose-400">[{err.logger}]</span>
                </div>
                <div className="text-zinc-300 break-words [overflow-wrap:anywhere]">
                  {err.message}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
