/**
 * Call History Component
 * Displays list of recent calls with details
 */

import { Phone, PhoneIncoming, PhoneOutgoing, Video, Clock } from 'lucide-react';
import { useCallHistory, type CallHistoryEntry } from '@/hooks/useCallHistory';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function CallHistoryItem({ entry }: { entry: CallHistoryEntry }) {
  const author = useAuthor(entry.remotePubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(entry.remotePubkey);
  const avatar = metadata?.picture;

  const getStatusColor = () => {
    switch (entry.status) {
      case 'completed': return 'text-green-600';
      case 'missed': return 'text-orange-600';
      case 'rejected': return 'text-red-600';
      case 'failed': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (entry.status) {
      case 'completed': return 'Completed';
      case 'missed': return 'Missed';
      case 'rejected': return 'Rejected';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group active:bg-gray-100 dark:active:bg-gray-700">
      {/* Avatar */}
      <Avatar className="h-12 w-12">
        <AvatarImage src={avatar} alt={displayName} />
        <AvatarFallback className="text-sm font-semibold">
          {displayName.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Call Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium truncate">{displayName}</span>
          {entry.callType === 'video' && (
            <Video className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {entry.direction === 'incoming' ? (
            <PhoneIncoming className={`h-3.5 w-3.5 ${entry.status === 'missed' ? 'text-red-500' : ''}`} />
          ) : (
            <PhoneOutgoing className="h-3.5 w-3.5" />
          )}
          <span className={getStatusColor()}>{getStatusText()}</span>
          {entry.duration && (
            <>
              <span>•</span>
              <span>{formatDuration(entry.duration)}</span>
            </>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="text-xs text-gray-500">
          {formatTime(entry.startTime)}
        </div>
      </div>
    </div>
  );
}

interface CallHistoryProps {
  history?: CallHistoryEntry[];
  onClearHistory?: () => void;
  onRemoveEntry?: (id: string) => void;
}

export function CallHistory(props?: CallHistoryProps) {
  const hookData = useCallHistory();
  const history = props?.history ?? hookData.history;
  const clearHistory = props?.onClearHistory ?? hookData.clearHistory;

  if (history.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" />
            Recent
          </div>
        </div>
        <div className="text-center py-12 text-gray-500">
          <Phone className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No recent calls</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4" />
          Recent
          <Badge variant="secondary" className="text-xs">{history.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearHistory}
          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
        >
          Clear
        </Button>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[60vh] overflow-y-auto">
        {history.map((entry) => (
          <CallHistoryItem key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
