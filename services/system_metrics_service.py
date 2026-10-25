"""
System Metrics & Process Inspection Service.
Provides high-efficiency host CPU and Memory process monitoring
using Windows ctypes (kernel32.dll, psapi.dll) with grouped aggregation
matching Windows Task Manager. Zero external dependencies.
"""

import ctypes
from ctypes import wintypes
import time
import os
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

# Constants
PROCESS_QUERY_INFORMATION = 0x0400
PROCESS_VM_READ = 0x0010
MAX_PATH = 260

# Ctypes structures
class PROCESS_MEMORY_COUNTERS_EX(ctypes.Structure):
    _fields_ = [
        ("cb", wintypes.DWORD),
        ("PageFaultCount", wintypes.DWORD),
        ("PeakWorkingSetSize", ctypes.c_size_t),
        ("WorkingSetSize", ctypes.c_size_t),
        ("QuotaPeakPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPagedPoolUsage", ctypes.c_size_t),
        ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t),
        ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
        ("PagefileUsage", ctypes.c_size_t),
        ("PeakPagefileUsage", ctypes.c_size_t),
        ("PrivateUsage", ctypes.c_size_t),
    ]

class MEMORYSTATUSEX(ctypes.Structure):
    _fields_ = [
        ("dwLength", wintypes.DWORD),
        ("dwMemoryLoad", wintypes.DWORD),
        ("ullTotalPhys", ctypes.c_ulonglong),
        ("ullAvailPhys", ctypes.c_ulonglong),
        ("ullTotalPageFile", ctypes.c_ulonglong),
        ("ullAvailPageFile", ctypes.c_ulonglong),
        ("ullTotalVirtual", ctypes.c_ulonglong),
        ("ullAvailVirtual", ctypes.c_ulonglong),
        ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
    ]

class SystemMetricsService:
    def __init__(self):
        self._is_windows = os.name == "nt"
        self._kernel32 = None
        self._psapi = None
        self._prev_times: Dict[int, Dict[str, Any]] = {}
        self._prev_system_time = 0.0
        self._last_sample_time = 0.0
        self._cached_summary: Dict[str, Any] = {}

        if self._is_windows:
            try:
                self._kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
                self._psapi = ctypes.WinDLL("psapi", use_last_error=True)
            except Exception as e:
                logger.warning("Could not initialize Windows system DLLs: %s", str(e))

    def get_system_memory(self) -> Dict[str, Any]:
        """Return total, available, used physical memory and load percentage."""
        if not self._is_windows or not self._kernel32:
            return {"total_mb": 16384, "used_mb": 8192, "avail_mb": 8192, "percent": 50.0}

        stat = MEMORYSTATUSEX()
        stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
        if self._kernel32.GlobalMemoryStatusEx(ctypes.byref(stat)):
            total_mb = round(stat.ullTotalPhys / (1024 * 1024), 1)
            avail_mb = round(stat.ullAvailPhys / (1024 * 1024), 1)
            used_mb = round(total_mb - avail_mb, 1)
            return {
                "total_mb": total_mb,
                "used_mb": used_mb,
                "avail_mb": avail_mb,
                "percent": float(stat.dwMemoryLoad),
            }
        return {"total_mb": 16384, "used_mb": 8192, "avail_mb": 8192, "percent": 50.0}

    def _get_process_cpu_time(self, handle) -> float:
        """Calculate total process time (user + kernel) in seconds."""
        creation_time = wintypes.FILETIME()
        exit_time = wintypes.FILETIME()
        kernel_time = wintypes.FILETIME()
        user_time = wintypes.FILETIME()

        if self._kernel32.GetProcessTimes(
            handle,
            ctypes.byref(creation_time),
            ctypes.byref(exit_time),
            ctypes.byref(kernel_time),
            ctypes.byref(user_time)
        ):
            k_ticks = (kernel_time.dwHighDateTime << 32) + kernel_time.dwLowDateTime
            u_ticks = (user_time.dwHighDateTime << 32) + user_time.dwLowDateTime
            return (k_ticks + u_ticks) / 10000000.0
        return 0.0

    def collect_processes(self) -> List[Dict[str, Any]]:
        """Collect all accessible processes with memory and CPU measurements."""
        if not self._is_windows or not self._psapi or not self._kernel32:
            return []

        now = time.time()
        time_delta = now - self._prev_system_time if self._prev_system_time > 0 else 1.0
        if time_delta <= 0:
            time_delta = 1.0

        pids_arr = (wintypes.DWORD * 4096)()
        bytes_returned = wintypes.DWORD()
        if not self._psapi.EnumProcesses(
            ctypes.byref(pids_arr),
            ctypes.sizeof(pids_arr),
            ctypes.byref(bytes_returned)
        ):
            return []

        num_processes = bytes_returned.value // ctypes.sizeof(wintypes.DWORD)
        new_times = {}
        raw_list = []
        cpu_count = os.cpu_count() or 4

        for i in range(num_processes):
            pid = pids_arr[i]
            if pid <= 4:
                continue

            h_proc = self._kernel32.OpenProcess(
                PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
                False,
                pid
            )
            if not h_proc:
                continue

            try:
                name_buf = (ctypes.c_char * MAX_PATH)()
                if not self._psapi.GetProcessImageFileNameA(h_proc, name_buf, MAX_PATH):
                    continue

                full_path = name_buf.value.decode("utf-8", errors="ignore")
                base_name = full_path.split("\\")[-1] if full_path else f"PID_{pid}"

                pmc = PROCESS_MEMORY_COUNTERS_EX()
                pmc.cb = ctypes.sizeof(PROCESS_MEMORY_COUNTERS_EX)
                mem_bytes = 0
                if self._psapi.GetProcessMemoryInfo(h_proc, ctypes.byref(pmc), pmc.cb):
                    mem_bytes = pmc.WorkingSetSize

                cpu_time = self._get_process_cpu_time(h_proc)
                new_times[pid] = cpu_time

                cpu_percent = 0.0
                if pid in self._prev_times and self._prev_system_time > 0:
                    delta_proc_time = cpu_time - self._prev_times[pid]
                    if delta_proc_time > 0:
                        cpu_percent = (delta_proc_time / (time_delta * cpu_count)) * 100.0

                raw_list.append({
                    "pid": pid,
                    "name": base_name,
                    "memory_bytes": mem_bytes,
                    "cpu_percent": round(min(cpu_percent, 100.0), 1),
                })
            finally:
                self._kernel32.CloseHandle(h_proc)

        self._prev_times = new_times
        self._prev_system_time = now
        return raw_list

    def get_task_manager_snapshot(self, sort_by: str = "memory", limit: int = 15) -> Dict[str, Any]:
        """
        Group processes by friendly name (matching Task Manager), calculate
        RAM usage in MB and CPU usage, and sort by highest utilization.
        """
        mem_info = self.get_system_memory()
        raw_procs = self.collect_processes()

        # Group multi-instance processes (e.g. Antigravity IDE, Chrome, Python)
        grouped: Dict[str, Dict[str, Any]] = {}

        for p in raw_procs:
            raw_name = p["name"]
            display_name = raw_name
            # Friendly friendly label mapping for key apps
            lower_name = raw_name.lower()
            if "antigravity" in lower_name:
                display_name = "Antigravity IDE"
            elif "chrome" in lower_name:
                display_name = "Google Chrome"
            elif "code" in lower_name:
                display_name = "Visual Studio Code"
            elif "msedge" in lower_name:
                display_name = "Microsoft Edge"
            elif "python" in lower_name:
                display_name = "Python Runtime"
            elif "node" in lower_name:
                display_name = "Node.js JavaScript Runtime"
            elif "mongod" in lower_name:
                display_name = "MongoDB Server"

            if display_name not in grouped:
                grouped[display_name] = {
                    "name": display_name,
                    "pids": [p["pid"]],
                    "count": 1,
                    "memory_bytes": p["memory_bytes"],
                    "cpu_percent": p["cpu_percent"],
                }
            else:
                grouped[display_name]["pids"].append(p["pid"])
                grouped[display_name]["count"] += 1
                grouped[display_name]["memory_bytes"] += p["memory_bytes"]
                grouped[display_name]["cpu_percent"] = round(grouped[display_name]["cpu_percent"] + p["cpu_percent"], 1)

        total_system_mb = mem_info["total_mb"] or 16384.0
        total_cpu = sum(g["cpu_percent"] for g in grouped.values())

        process_list = []
        for g in grouped.values():
            mem_mb = round(g["memory_bytes"] / (1024 * 1024), 1)
            mem_pct = round((mem_mb / total_system_mb) * 100.0, 1)
            process_list.append({
                "name": g["name"],
                "count": g["count"],
                "pid": g["pids"][0] if g["count"] == 1 else None,
                "memory_mb": mem_mb,
                "memory_percent": mem_pct,
                "cpu_percent": round(g["cpu_percent"], 1),
            })

        # Sort by selected column
        if sort_by.lower() == "cpu":
            process_list.sort(key=lambda x: x["cpu_percent"], reverse=True)
        else:
            process_list.sort(key=lambda x: x["memory_mb"], reverse=True)

        sliced = process_list[:limit]

        return {
            "summary": {
                "total_memory_mb": mem_info["total_mb"],
                "used_memory_mb": mem_info["used_mb"],
                "memory_percent": mem_info["percent"],
                "total_cpu_percent": round(min(total_cpu, 100.0), 1),
                "process_count": len(raw_procs),
            },
            "processes": sliced,
            "sort_by": sort_by,
            "limit": limit,
        }

system_metrics_service = SystemMetricsService()
