export function mergeTurnsPreservingHistory(existingTurns, incomingRecentTurns) {
  if (!Array.isArray(incomingRecentTurns) || incomingRecentTurns.length === 0) {
    return existingTurns;
  }
  if (!Array.isArray(existingTurns) || existingTurns.length === 0) {
    return incomingRecentTurns;
  }
  const incomingIds = new Set(incomingRecentTurns.map(t => t.id));
  const firstIncomingIdx = incomingRecentTurns[0]?.turn_index;

  const preservedOlder = existingTurns.filter(t => {
    if (!t || !t.id || t.id.startsWith('client-')) return false;
    if (incomingIds.has(t.id)) return false;
    if (typeof firstIncomingIdx === 'number' && typeof t.turn_index === 'number') {
      return t.turn_index < firstIncomingIdx;
    }
    return true;
  });

  return [...preservedOlder, ...incomingRecentTurns];
}
