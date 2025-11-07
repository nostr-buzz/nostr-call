/**
 * Calling Screen Component
 * Shows the outgoing call interface with calling animation
 */

import { Phone, PhoneOff } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useCall } from '@/hooks/useCall';
import { useEffect, useState } from 'react';

interface CallingScreenProps {
  remotePubkey: string;
  callType: 'audio' | 'video';
}

export function CallingScreen({ remotePubkey, callType }: CallingScreenProps) {
  const { hangup } = useCall();
  const author = useAuthor(remotePubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name || genUserName(remotePubkey);
  const avatar = metadata?.picture;
  const [dots, setDots] = useState('');

  // Animated dots for calling state
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-500 to-purple-600 z-50 flex flex-col items-center justify-center text-white">
      {/* Status Bar Spacer */}
      <div className="safe-area-top" />
      
      {/* Avatar and Info */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 px-8">
        <div className="relative">
          {/* Pulsing rings animation */}
          <div className="absolute inset-0 animate-ping">
            <div className="h-40 w-40 rounded-full border-2 border-white/30" />
          </div>
          <div className="absolute inset-0 animate-pulse delay-300">
            <div className="h-40 w-40 rounded-full border-2 border-white/20" />
          </div>
          
          {/* Avatar */}
          <Avatar className="h-40 w-40 border-4 border-white/50">
            <AvatarImage src={avatar} alt={displayName} />
            <AvatarFallback className="text-4xl font-bold bg-white/20 text-white">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Name and Status */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-light">{displayName}</h1>
          <p className="text-xl text-white/80">
            Calling{dots}
          </p>
          <p className="text-sm text-white/60 capitalize">
            {callType} call
          </p>
        </div>

        {/* Call Type Icon */}
        <div className="flex justify-center">
          {callType === 'video' ? (
            <div className="bg-white/20 p-4 rounded-full">
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15 8v8H5V8h10m1-2H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4V7c0-.55-.45-1-1-1z"/>
              </svg>
            </div>
          ) : (
            <div className="bg-white/20 p-4 rounded-full">
              <Phone className="h-8 w-8" />
            </div>
          )}
        </div>
      </div>

      {/* End Call Button */}
      <div className="pb-12 safe-area-bottom">
        <Button
          onClick={hangup}
          className="h-20 w-20 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl"
          size="lg"
        >
          <PhoneOff className="h-10 w-10 text-white" />
        </Button>
      </div>
    </div>
  );
}