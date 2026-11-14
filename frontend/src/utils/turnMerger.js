export function mergeTurnsPreservingHistory(existingTurns, incomingRecentTurns) {
  if (!Array.isArray(incomingRecentTurns) || incomingRecentTurns.length === 0) {
    return existingTurns;
  }
  if (!Array.isArray(existingTurns) || existingTurns.length === 0) {
    return incomingRecentTurns;
  }
  const incomingIds = new Set(incomingRecentTurns.map(t => t.id));
  const firstIncomingIdx = incomingRecentTurns[0]?.turn_index;

  // Preserve optimistic client turns that have not yet been reflected in server turns
  const activeOptimisticTurns = existingTurns.filter(t => t?.id?.startsWith('client-'));

  const preservedOlder = existingTurns.filter(t => {
    if (!t || !t.id || t.id.startsWith('client-')) return false;
    if (incomingIds.has(t.id)) return false;
    if (typeof firstIncomingIdx === 'number' && typeof t.turn_index === 'number') {
      return t.turn_index < firstIncomingIdx;
    }
    return true;
  });

  // If server has returned incoming turns that match or follow the client prompt, drop optimistic turn
  const finalOptimistic = activeOptimisticTurns.filter(opt => {
    // If the server's incoming turns already include a user prompt with the exact same text, drop optimistic duplicate
    if (opt.role === 'user') {
      const alreadyReceived = incomingRecentTurns.some(
        inc => inc.role === 'user' && (inc.text || '').trim() === (opt.text || '').trim()
      );
      if (alreadyReceived) return false;
    }

    // If optimistic turn is an agent placeholder and the server has an active/recent agent turn, drop placeholder
    if (opt.role === 'agent') {
      const hasServerAgent = incomingRecentTurns.some(inc => inc.role === 'agent');
      if (hasServerAgent) return false;
    }

    // If the latest incoming turn was created after the optimistic turn or is actively working, don't duplicate
    const lastIncoming = incomingRecentTurns[incomingRecentTurns.length - 1];
    if (lastIncoming?.role === 'agent' && lastIncoming.is_working) return false;
    return true;
  });

  return [...preservedOlder, ...incomingRecentTurns, ...finalOptimistic];
}
