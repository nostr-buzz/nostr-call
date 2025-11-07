/**
 * Call Details Dialog Component
 * Shows detailed information about a call history entry with option to call back
 */

import { useState } from 'react';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, Clock, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import type { CallHistoryEntry } from '@/hooks/useCallHistory';

interface CallDetailsDialogProps {
  entry: CallHistoryEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartCall?: (pubkey: string, callType: 'audio' | 'video') => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

export function CallDetailsDialog({ entry, open, onOpenChange, onStartCall }: CallDetailsDialogProps) {
  const [isCallLoading, setIsCallLoading] = useState(false);
  const author = useAuthor(entry.remotePubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(entry.remotePubkey);
  const avatar = metadata?.picture;

  const getStatusColor = () => {
    switch (entry.status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'missed': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'failed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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

  const handleCallBack = async (callType: 'audio' | 'video') => {
    if (!onStartCall) return;
    
    setIsCallLoading(true);
    try {
      await onStartCall(entry.remotePubkey, callType);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to start call:', error);
    } finally {
      setIsCallLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Call Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contact Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={avatar} alt={displayName} />
              <AvatarFallback className="text-lg font-semibold">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{displayName}</h3>
              <p className="text-sm text-gray-500 truncate">{entry.remotePubkey.slice(0, 16)}...</p>
            </div>
          </div>

          <Separator />

          {/* Call Details */}
          <div className="space-y-4">
            {/* Call Type & Direction */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {entry.direction === 'incoming' ? (
                  <>
                    <PhoneIncoming className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Incoming call</span>
                  </>
                ) : (
                  <>
                    <PhoneOutgoing className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Outgoing call</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                {entry.callType === 'video' ? (
                  <>
                    <Video className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Video call</span>
                  </>
                ) : (
                  <>
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Voice call</span>
                  </>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge className={getStatusColor()}>
                {getStatusText()}
              </Badge>
            </div>

            {/* Duration */}
            {entry.duration && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Duration:</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-sm font-mono">{formatDuration(entry.duration)}</span>
                </div>
              </div>
            )}

            {/* Start Time */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Started:</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-sm">{formatDateTime(entry.startTime)}</span>
              </div>
            </div>

            {/* End Time */}
            {entry.endTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ended:</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-sm">{formatDateTime(entry.endTime)}</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleCallBack('audio')}
              disabled={isCallLoading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-4 w-4 mr-2" />
              Start voice call
            </Button>
            <Button
              onClick={() => handleCallBack('video')}
              disabled={isCallLoading}
              variant="outline"
              className="flex-1"
            >
              <Video className="h-4 w-4 mr-2" />
              Start video call
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
