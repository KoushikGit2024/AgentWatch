import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  ExternalLink,
  Trash2,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from '../../services/toastService';
import { LogKpiCards } from './LogKpiCards';
import { HourlyActivityHistogram } from './HourlyActivityHistogram';
import { LogBreakdownCharts } from './LogBreakdownCharts';
import { LogSearchExplorer } from './LogSearchExplorer';

export function LogAnalyzerView({ onOpenFileInViewer }) {
  const [files, setFiles] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLogFiles = async (preferredDate = null) => {
    setIsLoadingFiles(true);
    try {
      const res = await api.getLogFiles();
      const logFiles = res.files || [];
      setFiles(logFiles);
      if (logFiles.length > 0) {
        if (preferredDate && logFiles.some(f => f.date === preferredDate)) {
          setSelectedDate(preferredDate);
        } else if (!selectedDate || !logFiles.some(f => f.date === selectedDate)) {
          setSelectedDate(logFiles[0].date);
        }
      } else {
        setSelectedDate('');
        setAnalytics(null);
      }
    } catch (err) {
      toast.error(err.message || 'Could not load log files list');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const fetchAnalytics = async dateStr => {
    if (!dateStr) return;
    setIsLoadingAnalytics(true);
    try {
      const data = await api.getLogAnalytics(dateStr);
      setAnalytics(data);
    } catch (err) {
      toast.error(err.message || 'Failed to compute log analytics');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!activeFileMeta) return;
    const confirmMsg = `Are you sure you want to delete ${activeFileMeta.filename}?\n\nIf this is today's active file, its contents will be cleared/truncated safely.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const res = await api.deleteLogFile(activeFileMeta.filename);
      toast.success(res.message || 'Log file deleted');
      await fetchLogFiles();
    } catch (err) {
      toast.error(err.message || 'Failed to delete log file');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchLogFiles();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchAnalytics(selectedDate);
    }
  }, [selectedDate]);

  const activeFileMeta = files.find(f => f.date === selectedDate);

  const maxHourlyCount = useMemo(() => {
    if (!analytics?.hourly_timeline || analytics.hourly_timeline.length === 0) return 1;
    const counts = analytics.hourly_timeline.map(h => Number(h.count) || 0);
    return Math.max(...counts, 1);
  }, [analytics]);

  const formatBytes = bytes => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(2)} MB`;
  };

  const [hoveredBucket, setHoveredBucket] = useState(null);
  const [colorMode, setColorMode] = useState('status'); // 'status' (2xx, 3xx, 4xx, 5xx) or 'severity' (INFO, WARN, ERR)

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0c0e14] overflow-y-auto p-3 sm:p-5 space-y-4 select-text">
      {/* Top Toolbar: Date Selector & File Stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-b from-[#181c26] to-[#131620] border border-[#272d3d] shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#F1F3F5] flex items-center gap-2">
              <span>Select Log Date</span>
              {activeFileMeta && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#222736] text-[#A6AFBF] border border-[#31394d]">
                  {formatBytes(activeFileMeta.size_bytes)}
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-[#828c9e] truncate">
              {activeFileMeta?.filename || 'No log selected'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Custom Styled Dark Date Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              disabled={isLoadingFiles || files.length === 0}
              className="bg-[#181d2a] hover:bg-[#1f2537] border border-[#2d3548] text-xs font-mono text-[#F1F3F5] px-3 py-1.5 rounded-lg flex items-center gap-2 outline-none focus:border-blue-500/60 transition cursor-pointer shadow-xs"
            >
              <span>
                {selectedDate
                  ? `${selectedDate} (${formatBytes(activeFileMeta?.size_bytes)})`
                  : 'Select Log Date'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#828c9e] transition-transform duration-150 ${isDateDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isDateDropdownOpen && files.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsDateDropdownOpen(false)}
                />
                <div
                  className="absolute right-0 top-full mt-1.5 z-50 w-64 max-h-60 overflow-y-auto rounded-xl border border-[#2d3548] shadow-2xl py-1 text-xs font-mono"
                  style={{ backgroundColor: '#181d2a', opacity: 1 }}
                >
                  {files.map(f => (
                    <button
                      key={f.date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(f.date);
                        setIsDateDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between transition cursor-pointer ${
                        f.date === selectedDate
                          ? 'bg-blue-600/25 text-blue-300 font-semibold'
                          : 'text-[#F1F3F5] hover:bg-[#22283a]'
                      }`}
                    >
                      <span>{f.date}</span>
                      <span className="text-[10px] text-[#828c9e] font-normal">
                        {formatBytes(f.size_bytes)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => fetchAnalytics(selectedDate)}
            disabled={isLoadingAnalytics}
            title="Re-analyze selected log"
            className="p-1.5 text-[#A0A6AF] hover:text-[#E8EAED] hover:bg-[#222736] rounded-lg border border-[#2d3548] transition cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoadingAnalytics ? 'animate-spin text-blue-400' : ''}`}
            />
          </button>

          {activeFileMeta && (
            <a
              href={`/api/v1/files/raw?path=logs/${activeFileMeta.filename}`}
              target="_blank"
              rel="noopener noreferrer"
              download
              title="Download raw log file"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1a1f2c] hover:bg-[#222736] text-[#A0A6AF] hover:text-[#E8EAED] border border-[#2d3548] text-xs font-medium transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Raw</span>
            </a>
          )}

          {activeFileMeta && onOpenFileInViewer && (
            <button
              type="button"
              onClick={() => onOpenFileInViewer(`logs/${activeFileMeta.filename}`)}
              title="Open in Monaco File Viewer"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inspect</span>
            </button>
          )}

          {activeFileMeta && (
            <button
              type="button"
              onClick={handleDeleteLog}
              disabled={isDeleting}
              title="Delete or clear log file"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 border border-rose-800/40 text-xs font-medium transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoadingAnalytics && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-[#A0A6AF]">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Aggregating log metrics & parsing timelines...</span>
        </div>
      )}

      {!isLoadingAnalytics && analytics && !analytics.error && (
        <>
          {/* KPI Cards Row */}
          <LogKpiCards analytics={analytics} />

          {/* Hourly Activity Histogram Timeline */}
          <HourlyActivityHistogram
            analytics={analytics}
            maxHourlyCount={maxHourlyCount}
            colorMode={colorMode}
            setColorMode={setColorMode}
            hoveredBucket={hoveredBucket}
            setHoveredBucket={setHoveredBucket}
          />

          {/* Breakdown Graphs: Severity and HTTP */}
          <LogBreakdownCharts analytics={analytics} />

          {/* Search & Explorer for Endpoints, Loggers, and Error Excerpts */}
          <LogSearchExplorer analytics={analytics} />
        </>
      )}
    </div>
  );
}
