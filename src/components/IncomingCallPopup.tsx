/**
 * Incoming Call Popup Component
 * Professional popup that appears immediately when receiving a call (kind 1004)
 */

import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, Mic } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { CallType } from '@/types/call';

interface IncomingCallPopupProps {
  isOpen: boolean;
  callerPubkey: string;
  callType: CallType;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallPopup({
  isOpen,
  callerPubkey,
  callType,
  onAccept,
  onReject,
}: IncomingCallPopupProps) {
  const author = useAuthor(callerPubkey);
  const [ringCount, setRingCount] = useState(0);

  // Get caller info
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(callerPubkey);
  const avatar = metadata?.picture;

  // Ring animation
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setRingCount((prev) => prev + 1);
    }, 1000);

    // Auto-reject after 30 seconds
    const timeout = setTimeout(() => {
      onReject();
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      setRingCount(0);
    };
  }, [isOpen, onReject]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onReject()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            {callType === 'video' ? '📹 Video Call' : '📞 Audio Call'}
          </DialogTitle>
          <DialogDescription className="text-center">
            Incoming call via Nostr (kind 1004)
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {/* Caller Avatar with Ring Animation */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75 [animation-duration:2s]" />
            <Avatar className="h-24 w-24 border-4 border-green-500 relative">
              <AvatarImage src={avatar} alt={displayName} />
              <AvatarFallback className="text-2xl">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller Info */}
          <div className="text-center space-y-2">
            <h3 className="font-semibold text-xl">{displayName}</h3>
            <p className="text-sm text-muted-foreground font-mono">
              {callerPubkey.slice(0, 8)}...{callerPubkey.slice(-8)}
            </p>
            <Badge variant="outline" className="gap-1">
              {callType === 'video' ? (
                <Video className="h-3 w-3" />
              ) : (
                <Mic className="h-3 w-3" />
              )}
              {callType === 'video' ? 'Video Call' : 'Audio Call'}
            </Badge>
          </div>

          {/* Ringing indicator */}
          <div className="text-sm text-muted-foreground animate-pulse">
            Ringing... ({30 - ringCount}s)
          </div>

          {/* Call Actions */}
          <div className="flex gap-4 w-full max-w-xs">
            <Button
              variant="destructive"
              size="lg"
              onClick={onReject}
              className="flex-1 gap-2"
            >
              <PhoneOff className="h-5 w-5" />
              Decline
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={onAccept}
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
            >
              <Phone className="h-5 w-5" />
              Accept
            </Button>
          </div>

          {/* Security Info */}
          <div className="text-xs text-muted-foreground text-center max-w-xs">
            🔒 End-to-end encrypted via NIP-44
            <br />
            Signaling over Nostr kind 1004
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
