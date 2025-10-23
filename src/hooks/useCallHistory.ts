/**
 * Call History Hook
 * Manages call history with localStorage persistence
 */

import { useLocalStorage } from './useLocalStorage';
import { useCallback } from 'react';

export interface CallHistoryEntry {
  id: string;
  remotePubkey: string;
  callType: 'audio' | 'video';
  direction: 'incoming' | 'outgoing';
  status: 'completed' | 'missed' | 'rejected' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number; // in seconds
}

export function useCallHistory() {
  const [history, setHistory] = useLocalStorage<CallHistoryEntry[]>('nostr-call-history', []);

  const addCallToHistory = useCallback((entry: Omit<CallHistoryEntry, 'id'>) => {
    const newEntry: CallHistoryEntry = {
      ...entry,
      id: `${entry.startTime}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setHistory((prev) => [newEntry, ...prev].slice(0, 50)); // Keep last 50 calls
  }, [setHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, [setHistory]);

  return {
    history,
    addCallToHistory,
    clearHistory,
    removeEntry,
  };
}
