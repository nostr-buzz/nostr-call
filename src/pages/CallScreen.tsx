/**
 * CallScreen Component
 * Main UI for voice/video calling with controls
 */

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorX,
  User,
} from 'lucide-react';
import { useCall } from '@/hooks/useCall';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { MediaError } from '@/components/MediaError';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { CallType } from '@/types/call';

export default function CallScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useCurrentUser();

  // Get target pubkey and call type from URL params
  const targetPubkey = searchParams.get('pubkey');
  const callTypeParam = searchParams.get('type') as CallType | null;
  const callType: CallType = callTypeParam === 'audio' ? 'audio' : 'video';

  // Call context
  const {
    callState,
    currentSession,
    localStream,
    remoteStream,
    mediaState,
    incomingCall,
    startCall,
    answerCall,
    rejectCall,
    hangup,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useCall();

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // State
  const [error, setError] = useState<Error | null>(null);
  const [callDuration, setCallDuration] = useState<number>(0);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Initialize call on mount if target pubkey is provided
  useEffect(() => {
    if (targetPubkey && callState === 'idle' && !incomingCall) {
      startCall(targetPubkey, callType).catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      });
    }
  }, [targetPubkey, callType, callState, incomingCall, startCall]);

  // Update local video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update remote video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Track call duration
  useEffect(() => {
    if (callState === 'connected' && currentSession?.startTime) {
      const interval = setInterval(() => {
        const duration = Math.floor((Date.now() - (currentSession.startTime || 0)) / 1000);
        setCallDuration(duration);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [callState, currentSession]);

  // Handle hangup and navigate back
  const handleHangup = async () => {
    await hangup();
    navigate('/');
  };

  // Retry call after error
  const handleRetry = () => {
    setError(null);
    if (targetPubkey) {
      startCall(targetPubkey, callType).catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
      });
    }
  };

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get display name for pubkey
  const getDisplayName = (pubkey: string): string => {
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
  };

  // Render incoming call dialog
  if (incomingCall) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={`https://robohash.org/${incomingCall.remotePubkey}`} />
                <AvatarFallback>
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>

              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Incoming Call</h2>
                <p className="text-muted-foreground mb-1">
                  {getDisplayName(incomingCall.remotePubkey)}
                </p>
                <Badge variant="secondary">
                  {incomingCall.callType === 'video' ? 'Video Call' : 'Audio Call'}
                </Badge>
              </div>

              <div className="flex gap-4 w-full">
                <Button
                  onClick={rejectCall}
                  variant="destructive"
                  size="lg"
                  className="flex-1"
                >
                  <PhoneOff className="mr-2 h-5 w-5" />
                  Decline
                </Button>
                <Button onClick={answerCall} size="lg" className="flex-1 bg-green-600 hover:bg-green-700">
                  <Phone className="mr-2 h-5 w-5" />
                  Answer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-gray-900 overflow-hidden">
      {/* Error Display */}
      {error && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/95 p-4">
          <MediaError error={error} onRetry={handleRetry} />
        </div>
      )}

      {/* Remote Video (Full Screen) */}
      <div className="absolute inset-0">
        {remoteStream && callType === 'video' ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Avatar className="h-32 w-32">
              <AvatarImage
                src={`https://robohash.org/${currentSession?.remotePubkey || targetPubkey}`}
              />
              <AvatarFallback>
                <User className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Local Video (Picture-in-Picture) */}
      {localStream && callType === 'video' && (
        <div className="absolute top-4 right-4 w-48 h-36 rounded-lg overflow-hidden shadow-xl border-2 border-white z-10">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        </div>
      )}

      {/* Call Info Overlay */}
      <div className="absolute top-4 left-4 z-10">
        <Card className="bg-black/50 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="text-white space-y-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant={callState === 'connected' ? 'default' : 'secondary'}
                  className={
                    callState === 'connected'
                      ? 'bg-green-600'
                      : callState === 'calling'
                        ? 'bg-yellow-600'
                        : 'bg-gray-600'
                  }
                >
                  {callState}
                </Badge>
                {callState === 'connected' && (
                  <span className="text-sm font-mono">{formatDuration(callDuration)}</span>
                )}
              </div>
              <p className="text-sm">
                {getDisplayName(currentSession?.remotePubkey || targetPubkey || '')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <Card className="bg-black/50 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {/* Mute Audio */}
              <Button
                onClick={toggleAudio}
                size="lg"
                variant={mediaState.audioEnabled ? 'secondary' : 'destructive'}
                className="rounded-full h-14 w-14"
              >
                {mediaState.audioEnabled ? (
                  <Mic className="h-6 w-6" />
                ) : (
                  <MicOff className="h-6 w-6" />
                )}
              </Button>

              {/* Toggle Video */}
              {callType === 'video' && (
                <Button
                  onClick={toggleVideo}
                  size="lg"
                  variant={mediaState.videoEnabled ? 'secondary' : 'destructive'}
                  className="rounded-full h-14 w-14"
                >
                  {mediaState.videoEnabled ? (
                    <Video className="h-6 w-6" />
                  ) : (
                    <VideoOff className="h-6 w-6" />
                  )}
                </Button>
              )}

              {/* Screen Share */}
              {callType === 'video' && (
                <Button
                  onClick={() => {
                    if (mediaState.isScreenSharing) {
                      stopScreenShare();
                    } else {
                      startScreenShare();
                    }
                  }}
                  size="lg"
                  variant={mediaState.isScreenSharing ? 'default' : 'secondary'}
                  className="rounded-full h-14 w-14"
                >
                  {mediaState.isScreenSharing ? (
                    <MonitorX className="h-6 w-6" />
                  ) : (
                    <MonitorUp className="h-6 w-6" />
                  )}
                </Button>
              )}

              {/* Hangup */}
              <Button
                onClick={handleHangup}
                size="lg"
                variant="destructive"
                className="rounded-full h-14 w-14 bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
