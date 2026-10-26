import { useState, useCallback } from 'react';
import { api } from '../services/api';

export function useAgentAuxData(isMountedRef) {
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [isTimelineLoading, setIsTimelineLoading] = useState(false);
    const [systemLogs, setSystemLogs] = useState([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);
    const [recoveryItems, setRecoveryItems] = useState([]);
    const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);
    const [diagnostics, setDiagnostics] = useState(null);
    const [historyChats, setHistoryChats] = useState([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const fetchTimelineEvents = useCallback(async () => {
        setIsTimelineLoading(true);
        try {
            const data = await api.getTimeline(80);
            if (isMountedRef.current) {
                setTimelineEvents(data.events || []);
            }
        } catch {} finally {
            if (isMountedRef.current) setIsTimelineLoading(false);
        }
    }, [isMountedRef]);

    const fetchSystemLogs = useCallback(async () => {
        setIsLogsLoading(true);
        try {
            const data = await api.getLogs(250);
            if (isMountedRef.current) {
                setSystemLogs(data.logs || []);
            }
        } catch {} finally {
            if (isMountedRef.current) setIsLogsLoading(false);
        }
    }, [isMountedRef]);

    const fetchRecoveryItems = useCallback(async () => {
        setIsRecoveryLoading(true);
        try {
            const [recData, diagData] = await Promise.all([
                api.getRecoveryItems().catch(() => ({ recovery_items: [] })),
                api.getDiagnostics().catch(() => null)
            ]);
            if (isMountedRef.current) {
                const items = Array.isArray(recData) ? recData : (recData.recovery_items || []);
                setRecoveryItems(items);
                setDiagnostics(diagData);
            }
        } catch {} finally {
            if (isMountedRef.current) setIsRecoveryLoading(false);
        }
    }, [isMountedRef]);

    const fetchHistoryChats = useCallback(async () => {
        setIsHistoryLoading(true);
        try {
            const data = await api.getHistoryChats();
            if (isMountedRef.current) {
                setHistoryChats(data.chats || []);
            }
        } catch {
            if (isMountedRef.current) setHistoryChats([]);
        } finally {
            if (isMountedRef.current) setIsHistoryLoading(false);
        }
    }, [isMountedRef]);

    return {
        timelineEvents,
        isTimelineLoading,
        systemLogs,
        isLogsLoading,
        recoveryItems,
        isRecoveryLoading,
        diagnostics,
        historyChats,
        isHistoryLoading,
        fetchTimelineEvents,
        fetchSystemLogs,
        fetchRecoveryItems,
        fetchHistoryChats
    };
}
