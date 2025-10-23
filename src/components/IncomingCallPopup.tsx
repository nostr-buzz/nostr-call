/**
 * Incoming Call Popup Component
 * Professional popup that appears immediately when receiving a call (kind 1004)
 * Features: Ringtone, vibration, animations, auto-reject timer
 */

import { useEffect, useState, useRef } from 'react';
import { Phone, PhoneOff, Video, Mic, Shield } from 'lucide-react';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get caller info
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(callerPubkey);
  const avatar = metadata?.picture;
  const about = metadata?.about;

  // Play ringtone MP3 and vibrate
  useEffect(() => {
    if (!isOpen) return;

    // Create and play audio element with ringing.mp3
    const audio = new Audio('/nostr-call/ringing.mp3');
    audio.loop = true;
    audio.volume = 0.7;
    audioRef.current = audio;

    // Play audio with error handling
    const playAudio = async () => {
      try {
        await audio.play();
        console.log('Ringtone playing');
      } catch (error) {
        console.warn('Could not play ringtone (user interaction may be required):', error);
      }
    };

    playAudio();

    // Vibrate if supported
    if (navigator.vibrate) {
      const vibratePattern = [400, 200, 400, 200, 400];
      const vibrateInterval = setInterval(() => {
        navigator.vibrate(vibratePattern);
      }, 2000);

      navigator.vibrate(vibratePattern); // Start immediately

      return () => {
        clearInterval(vibrateInterval);
        navigator.vibrate(0); // Stop vibration
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [isOpen]);

  // Ring counter and auto-reject
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setRingCount((prev) => prev + 1);
    }, 1000);

    // Auto-reject after 45 seconds
    const timeout = setTimeout(() => {
      console.log('Call auto-rejected after 45 seconds');
      onReject();
    }, 45000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
      setRingCount(0);
    };
  }, [isOpen, onReject]);

  const handleAccept = () => {
    // Stop ringtone and vibration
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
    onAccept();
  };

  const handleReject = () => {
    // Stop ringtone and vibration
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
    onReject();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReject()}>
      <DialogContent className="sm:max-w-md border-2 border-green-500/50 shadow-2xl shadow-green-500/20">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            {callType === 'video' ? 'Video Call' : 'Audio Call'}
          </DialogTitle>
          <DialogDescription className="text-center font-medium">
            Incoming Nostr Call
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          {/* Caller Avatar with Multiple Ring Animations */}
          <div className="relative w-28 h-28">
            {/* Outer ring - slower */}
            <div className="absolute rounded-full bg-green-500/30 animate-ping [animation-duration:3s] w-[140px] h-[140px] -left-[10px] -top-[10px]" />
            {/* Middle ring */}
            <div className="absolute rounded-full bg-green-500/50 animate-ping [animation-duration:2s] w-[130px] h-[130px] -left-[5px] -top-[5px]" />
            {/* Inner ring - faster */}
            <div className="absolute inset-0 rounded-full bg-green-500/70 animate-ping [animation-duration:1.5s]" />
            
            {/* Avatar */}
            <Avatar className="h-28 w-28 border-4 border-green-500 relative z-10 shadow-xl">
              <AvatarImage src={avatar} alt={displayName} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Caller Info */}
          <div className="text-center space-y-3 max-w-xs">
            <h3 className="font-bold text-2xl">{displayName}</h3>
            
            {about && (
              <p className="text-sm text-muted-foreground line-clamp-2 px-4">
                {about}
              </p>
            )}
            
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="gap-1.5 px-3 py-1">
                {callType === 'video' ? (
                  <Video className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Mic className="h-3.5 w-3.5 text-green-600" />
                )}
                <span className="font-semibold">
                  {callType === 'video' ? 'Video Call' : 'Voice Call'}
                </span>
              </Badge>
              <Badge variant="outline" className="gap-1.5 px-3 py-1">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                <span className="font-semibold">Encrypted</span>
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground font-mono">
              {callerPubkey.slice(0, 12)}...{callerPubkey.slice(-12)}
            </p>
          </div>

          {/* Ringing indicator with progress */}
          <div className="w-full max-w-xs space-y-2">
            <div className="text-center text-sm font-medium text-green-600 animate-pulse">
              ☎️ Ringing...
            </div>
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000"
                style={
                  {
                    '--progress': (ringCount / 45) * 100,
                    width: `${(ringCount / 45) * 100}%`,
                  } as React.CSSProperties
                }
              />
            </div>
            <div className="text-center text-xs text-muted-foreground">
              Auto-decline in {45 - ringCount}s
            </div>
          </div>

          {/* Call Actions - Large Touch-Friendly Buttons */}
          <div className="flex gap-4 w-full max-w-xs">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleReject}
              className="flex-1 gap-2 h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <PhoneOff className="h-5 w-5" />
              Decline
            </Button>
            <Button
              variant="default"
              size="lg"
              onClick={handleAccept}
              className="flex-1 gap-2 h-14 text-base font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
            >
              <Phone className="h-5 w-5" />
              Accept
            </Button>
          </div>

          {/* Security Info */}
          <div className="text-xs text-muted-foreground text-center max-w-xs space-y-1 pt-2 border-t">
            <div className="flex items-center justify-center gap-1.5">
              <Shield className="h-3 w-3 text-blue-500" />
              <span>End-to-end encrypted (NIP-44)</span>
            </div>
            <div>Signaling via Nostr kind 1004</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
